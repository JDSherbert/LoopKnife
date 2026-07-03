

export class Importer {

	static extractWavLoopTags(buffer) {
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);
        let offset = 12; // Skip RIFF header

        let loopStart = null;
        let loopEnd = null;

        while (offset < buffer.byteLength - 8) {
            const id = String.fromCharCode(view.getUint8(offset), view.getUint8(offset+1), view.getUint8(offset+2), view.getUint8(offset+3));
            const size = view.getUint32(offset + 4, true);
            const dataStart = offset + 8;

            // Check native hardware Sampler Chunk
            if (id === "smpl" && size >= 52) {
                const numLoops = view.getUint32(dataStart + 28, true);
                if (numLoops > 0) {
                    // Pull coordinates out of the first active hardware loop point definition block
                    loopStart = view.getUint32(dataStart + 44, true);
                    loopEnd = view.getUint32(dataStart + 48, true);
                }
            }
            
            // Check metadata editor ID3 text chunk if hardware loops aren't populated
            if (id === "id3 " && loopStart === null) {
                const textStr = new TextDecoder().decode(bytes.subarray(dataStart, dataStart + size));
                const matchStart = textStr.match(/LOOPSTART\x00+(\d+)/i) || textStr.match(/LOOPSTART=(\d+)/i);
                const matchEnd = textStr.match(/LOOPEND\x00+(\d+)/i) || textStr.match(/LOOPEND=(\d+)/i);
                if (matchStart) loopStart = parseInt(matchStart[1], 10);
                if (matchEnd) loopEnd = parseInt(matchEnd[1], 10);
            }

            offset = dataStart + size;
            if (size % 2 === 1) offset++; // Word alignment padding check
        }

        return { start: loopStart, end: loopEnd };
    }

    static extractOggLoopTags(buffer) {
        const bytes = new Uint8Array(buffer);
        const decoder = new TextDecoder();
        let loopStart = null;
        let loopEnd = null;

        // Ogg tags reside in the comment packets. Instead of mapping full Ogg structural mapping,
        // we can efficiently safely scan the binary space for the text pattern.
        const textDump = decoder.decode(bytes);
        
        const matchStart = textDump.match(/LOOPSTART=(\d+)/i);
        const matchEnd = textDump.match(/LOOPEND=(\d+)/i);

        if (matchStart) loopStart = parseInt(matchStart[1], 10);
        if (matchEnd) loopEnd = parseInt(matchEnd[1], 10);

        return { start: loopStart, end: loopEnd };
    }

}
