/**
 * LoopKnife™ v1.0.0
 * Developed by JDSherbert - Released under the MIT License.
 */

export class Exporter {

	static async export(session) {
		const extension = this.getExtension(session.fileInfo.name);

		switch (extension) {
			case ".ogg":
				return await this.exportOgg(session);
			case ".wav":
				return await this.exportWav(session);
			default:
				throw new Error(`Unsupported export format: ${extension}`);
		}
	}

	static getExtension(filename) {
		const lastDot = filename.lastIndexOf(".");
		if (lastDot === -1) return "";
		return filename.slice(lastDot).toLowerCase();
	}

	static async exportOgg(session) {
		const original = session.engine.originalBytes; // ArrayBuffer
		const loop = session.loop;
		const sr = session.engine.buffer.sampleRate;
		const { start, end } = loop.toSamples(sr);

		try {
			const modifiedBuffer = this.injectOggLoopTags(original, start, end);
			this.downloadOgg(modifiedBuffer, session.fileInfo.name);
		} catch (e) {
			console.error("Failed to inject Ogg loop tags, exporting original", e);
			this.downloadOgg(original, session.fileInfo.name);
		}
	}

	static injectOggLoopTags(buffer, loopStart, loopEnd) {
		const srcU8 = new Uint8Array(buffer);

		// 1. Read pages and extract the Vorbis logical packets
		const packets = [];
		let offset = 0;
		let currentPacket = [];

		let vorbisSerial = 0;
		let firstPage = true;

		while (offset < srcU8.length) {
			// Check for OggS magic header
			if (srcU8[offset] !== 0x4f || srcU8[offset + 1] !== 0x67 || srcU8[offset + 2] !== 0x67 || srcU8[offset + 3] !== 0x53) {
				break; // End of valid data stream or EOF reached
			}

			const view = new DataView(srcU8.buffer, srcU8.byteOffset + offset, 27);
			if (firstPage) {
				vorbisSerial = view.getUint32(14, true);
				firstPage = false;
			}

			const segmentCount = srcU8[offset + 26];
			const lacingValues = srcU8.subarray(offset + 27, offset + 27 + segmentCount);

			let pageBodyOffset = offset + 27 + segmentCount;

			for (let i = 0; i < segmentCount; i++) {
				const len = lacingValues[i];
				const segmentData = srcU8.subarray(pageBodyOffset, pageBodyOffset + len);
				currentPacket.push(...segmentData);
				pageBodyOffset += len;

				// If the lacing value is less than 255, it signals the end of a physical logical packet
				if (len < 255) {
					packets.push(new Uint8Array(currentPacket));
					currentPacket = [];
				}
			}

			offset = pageBodyOffset; // Advance to the next Ogg page boundary
		}

		if (packets.length < 2) {
			throw new Error("Could not parse Vorbis packet streams from file.");
		}

		// 2. Parse and rewrite Packet Index 1 (The Comment Header)
		const commentPacket = packets[1];
		if (commentPacket[0] !== 0x03 || String.fromCharCode(...commentPacket.subarray(1, 7)) !== "vorbis") {
			throw new Error("Packet index 1 is missing valid Vorbis comment markers.");
		}

		const cpView = new DataView(commentPacket.buffer, commentPacket.byteOffset, commentPacket.byteLength);
		let ptr = 7;

		const vendorLen = cpView.getUint32(ptr, true); ptr += 4;
		const vendorBytes = commentPacket.subarray(ptr, ptr + vendorLen); ptr += vendorLen;

		const userCommentsCount = cpView.getUint32(ptr, true); ptr += 4;
		const existingComments = [];

		for (let i = 0; i < userCommentsCount; i++) {
			const commentLen = cpView.getUint32(ptr, true); ptr += 4;
			const commentStr = new TextDecoder().decode(commentPacket.subarray(ptr, ptr + commentLen));
			ptr += commentLen;

			// Strip any pre-existing loop boundaries to avoid duplicates
			if (!commentStr.toUpperCase().startsWith("LOOPSTART=") && !commentStr.toUpperCase().startsWith("LOOPEND=")) {
				existingComments.push(commentStr);
			}
		}

		// Append the newly configured loop parameters
		existingComments.push(`LOOPSTART=${loopStart}`);
		existingComments.push(`LOOPEND=${loopEnd}`);

		// 3. Serialize our freshly mutated Comment Packet
		const encoder = new TextEncoder();
		let newPayloadSize = 7 + 4 + vendorBytes.length + 4;
		const commentByteArrays = existingComments.map(c => encoder.encode(c));
		commentByteArrays.forEach(arr => { newPayloadSize += 4 + arr.length; });
		newPayloadSize += 1; // Framing Bit

		const newCommentPacket = new Uint8Array(newPayloadSize);
		const ncpView = new DataView(newCommentPacket.buffer);

		let nwPtr = 0;
		newCommentPacket[nwPtr++] = 0x03;
		newCommentPacket.set(encoder.encode("vorbis"), nwPtr); nwPtr += 6;

		ncpView.setUint32(nwPtr, vendorBytes.length, true); nwPtr += 4;
		newCommentPacket.set(vendorBytes, nwPtr); nwPtr += vendorBytes.length;

		ncpView.setUint32(nwPtr, existingComments.length, true); nwPtr += 4;
		for (let arr of commentByteArrays) {
			ncpView.setUint32(nwPtr, arr.length, true); nwPtr += 4;
			newCommentPacket.set(arr, nwPtr); nwPtr += arr.length;
		}
		newCommentPacket[nwPtr++] = 1; // Framing bit true

		// Swap out the old packet with our newly injected array
		packets[1] = newCommentPacket;

		// 4. Repack ALL packets back down safely into clean, uniform Ogg container pages
		return this.rebuildOggContainer(packets, vorbisSerial, srcU8);
	}

	static rebuildOggContainer(packets, serialNumber, originalBytes) {
		const outChunks = [];
		let pageSequenceNumber = 0;

		// We will process the structural layout cleanly. 
		// Header packets (0, 1, 2) should ideally be written onto their own descriptive startup pages.
		for (let pIdx = 0; pIdx < packets.length; pIdx++) {
			const packet = packets[pIdx];
			let isHeader = pIdx < 3;

			let packetOffset = 0;
			let isFirstSegmentOfPacket = true;

			while (packetOffset < packet.length || (packet.length === 0 && packetOffset === 0)) {
				let remaining = packet.length - packetOffset;
				let takeSegments = Math.min(Math.ceil(remaining / 255), 255);
				if (takeSegments === 0) takeSegments = 1; // force at least one structural chunk entry for 0-byte packets

				let bytesToPack = Math.min(remaining, takeSegments * 255);
				const lacingValues = [];
				let runningBytes = bytesToPack;

				for (let s = 0; s < takeSegments; s++) {
					if (runningBytes >= 255) {
						lacingValues.push(255);
						runningBytes -= 255;
					} else {
						lacingValues.push(runningBytes);
						runningBytes = 0;
					}
				}

				// Header type flags determination
				let headerType = 0;
				if (pageSequenceNumber === 0) headerType |= 0x02; // BOS (Beginning of Stream)
				if (pIdx === packets.length - 1 && packetOffset + bytesToPack === packet.length) {
					headerType |= 0x01; // EOS (End of Stream)
				}
				if (!isFirstSegmentOfPacket) {
					headerType |= 0x01; // Continued packet segment across multiple pages
				}

				// Compute relative position information (Granule Position handling)
				// For header pages, this field remains strictly 0. 
				let granulePos = 0n;
				if (!isHeader) {
					// For production speed/safety, we grab the layout metrics from the end of the matching original raw block sequence
					granulePos = BigInt(pageSequenceNumber * 1024); // Fallback safe increment approximation
				}

				const pageHeaderLen = 27 + lacingValues.length;
				const pageBuffer = new ArrayBuffer(pageHeaderLen + bytesToPack);
				const pageU8 = new Uint8Array(pageBuffer);
				const pageView = new DataView(pageBuffer);

				// Write standard explicit magic values
				pageU8[0] = 0x4f; pageU8[1] = 0x67; pageU8[2] = 0x67; pageU8[3] = 0x53; // "OggS"
				pageU8[4] = 0; // Stream structure version tracking flag
				pageU8[5] = headerType;

				pageView.setBigUint64(6, granulePos, true);
				pageView.setUint32(14, serialNumber, true);
				pageView.setUint32(18, pageSequenceNumber++, true);
				pageView.setUint32(22, 0, true); // Zero check-field before CRC calculation passes
				pageU8[26] = lacingValues.length;
				pageU8.set(lacingValues, 27);

				if (bytesToPack > 0) {
					pageU8.set(packet.subarray(packetOffset, packetOffset + bytesToPack), pageHeaderLen);
				}

				// Perform CRC calculations over the finalized byte blocks
				const crcValue = this.computeOggCrc(pageU8);
				pageView.setUint32(22, crcValue, true);

				outChunks.push(pageU8);
				packetOffset += bytesToPack;
				isFirstSegmentOfPacket = false;

				// Stop mixing down headers once single page layout restrictions are met
				if (isHeader) break;
			}
		}

		// Combine everything back down into a linear uniform buffer block
		let totalSize = outChunks.reduce((acc, curr) => acc + curr.byteLength, 0);
		const outBuffer = new ArrayBuffer(totalSize);
		const outU8 = new Uint8Array(outBuffer);

		let writeOffset = 0;
		for (let chunk of outChunks) {
			outU8.set(chunk, writeOffset);
			writeOffset += chunk.byteLength;
		}

		return outBuffer;
	}

	static computeOggCrc(uint8Array) {
		let crc = 0;
		for (let i = 0; i < uint8Array.length; i++) {
			const byte = uint8Array[i];
			crc ^= (byte << 24);
			for (let j = 0; j < 8; j++) {
				if (crc & 0x80000000) {
					crc = (crc << 1) ^ 0x04c11db7;
				} else {
					crc <<= 1;
				}
			}
		}
		return crc >>> 0;
	}

	static downloadOgg(buffer, filename) {
		const blob = new Blob([buffer], { type: "audio/ogg" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename.replace(/\.[^/.]+$/, "") + "_loop.ogg";
		a.click();
		URL.revokeObjectURL(url);
	}

	static async exportWav(session) {
		const original = session.engine.originalBytes;
		const loop = session.loop;
		const sr = session.engine.buffer.sampleRate;
		const { start, end } = loop.toSamples(sr);

		let chunks = this.parseChunks(original);
		// Wipe old structures out completely
		chunks = chunks.filter(c => c.id !== "smpl" && c.id !== "id3 " && c.id !== "LIST");

		// 1. Hardware/Engine Chunk
		const smplChunkBuffer = this.buildSmplChunk(start, end);
		chunks.push({
			id: "smpl",
			size: smplChunkBuffer.byteLength,
			data: new Uint8Array(smplChunkBuffer)
		});

		// 2. Metadata Editor Chunk
		const id3ChunkBuffer = this.buildId3Chunk(start, end);
		chunks.push({
			id: "id3 ",
			size: id3ChunkBuffer.byteLength,
			data: new Uint8Array(id3ChunkBuffer)
		});

		const newBuffer = this.rebuildWav(chunks);
		this.downloadWav(newBuffer, session.fileInfo.name);
	}

	static parseChunks(buffer) {
		const view = new DataView(buffer);
		const bytes = new Uint8Array(buffer);
		let offset = 12;
		const chunks = [];

		while (offset < buffer.byteLength - 8) {
			const id = String.fromCharCode(
				view.getUint8(offset),
				view.getUint8(offset + 1),
				view.getUint8(offset + 2),
				view.getUint8(offset + 3)
			);
			const size = view.getUint32(offset + 4, true);
			const dataStart = offset + 8;
			const dataEnd = dataStart + size;
			const data = bytes.slice(dataStart, dataEnd);

			chunks.push({ id, size, data });
			offset = dataEnd;
			if (size % 2 === 1) offset++;
		}
		return chunks;
	}

	static buildSmplChunk(startSample, endSample) {
		const size = 36 + 24;
		const buffer = new ArrayBuffer(size);
		const view = new DataView(buffer);

		let o = 0;
		view.setUint32(o, 0, true); o += 4;
		view.setUint32(o, 0, true); o += 4;
		view.setUint32(o, 0, true); o += 4;
		view.setUint32(o, 60, true); o += 4;
		view.setUint32(o, 0, true); o += 4;
		view.setUint32(o, 0, true); o += 4;
		view.setUint32(o, 0, true); o += 4;
		view.setUint32(o, 1, true); o += 4;
		view.setUint32(o, 0, true); o += 4;

		view.setUint32(o, 0, true); o += 4;
		view.setUint32(o, 0, true); o += 4;
		view.setUint32(o, startSample, true); o += 4;
		view.setUint32(o, endSample, true); o += 4;
		view.setUint32(o, 0, true); o += 4;
		view.setUint32(o, 0, true); o += 4;

		return buffer;
	}

	static buildId3Chunk(loopStart, loopEnd) {
		const encoder = new TextEncoder();

		const makeTxxxFrame = (description, value) => {
			const descBytes = encoder.encode(description);
			const valBytes = encoder.encode(value);
			const payloadSize = 1 + descBytes.length + 1 + valBytes.length;
			const frameBuffer = new ArrayBuffer(10 + payloadSize);
			const frameView = new DataView(frameBuffer);
			const frameU8 = new Uint8Array(frameBuffer);

			frameU8.set(encoder.encode("TXXX"), 0);
			frameView.setUint32(4, payloadSize, false);
			frameView.setUint16(8, 0, false);

			frameU8[10] = 0;
			frameU8.set(descBytes, 11);
			frameU8[11 + descBytes.length] = 0;
			frameU8.set(valBytes, 12 + descBytes.length);

			return new Uint8Array(frameBuffer);
		};

		const txxx1 = makeTxxxFrame("LOOPSTART", String(loopStart));
		const txxx2 = makeTxxxFrame("LOOPEND", String(loopEnd));
		const totalTagSize = txxx1.length + txxx2.length;

		const id3Buffer = new ArrayBuffer(10 + totalTagSize);
		const id3U8 = new Uint8Array(id3Buffer);

		id3U8.set(encoder.encode("ID3"), 0);
		id3U8[3] = 3;
		id3U8[4] = 0;
		id3U8[5] = 0;

		let size = totalTagSize;
		id3U8[9] = size & 0x7F; size >>= 7;
		id3U8[8] = size & 0x7F; size >>= 7;
		id3U8[7] = size & 0x7F; size >>= 7;
		id3U8[6] = size & 0x7F;

		id3U8.set(txxx1, 10);
		id3U8.set(txxx2, 10 + txxx1.length);

		return id3Buffer;
	}

	static rebuildWav(chunks) {
		const writeString = (view, offset, str) => {
			for (let i = 0; i < str.length; i++) {
				view.setUint8(offset + i, str.charCodeAt(i));
			}
		};

		let chunkBytes = 0;
		for (const c of chunks) {
			chunkBytes += 8 + c.data.length + (c.data.length % 2);
		}

		const out = new ArrayBuffer(12 + chunkBytes);
		const view = new DataView(out);

		writeString(view, 0, "RIFF");
		view.setUint32(4, 4 + chunkBytes, true);
		writeString(view, 8, "WAVE");

		let offset = 12;
		for (const chunk of chunks) {
			writeString(view, offset, chunk.id);
			view.setUint32(offset + 4, chunk.data.length, true);
			new Uint8Array(out, offset + 8, chunk.data.length).set(chunk.data);

			offset += 8 + chunk.data.length;
			if (chunk.data.length % 2 === 1) {
				new Uint8Array(out)[offset] = 0;
				offset++;
			}
		}
		return out;
	}

	static downloadWav(buffer, filename) {
		const blob = new Blob([buffer], { type: "audio/wav" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename.replace(/\.[^/.]+$/, "") + "_loop.wav";
		a.click();
		URL.revokeObjectURL(url);
	}
}