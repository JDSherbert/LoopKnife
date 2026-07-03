/**
 * LoopKnife™ v1.0.0
 * Developed by JDSherbert - Released under the MIT License.
 */

export class LoopRegion {
    constructor() {
        this.start = 0;
        this.end = 0;
    }

    setStart(value) {
        this.start = value;
        if (this.start > this.end) {
            this.end = this.start;
        }
    }

    setEnd(value) {
        this.end = value;
        if (this.end < this.start) {
            this.start = this.end;
        }
    }

    clamp(min, max) {
        this.start = Math.max(min, Math.min(this.start, max));
        this.end = Math.max(min, Math.min(this.end, max));
    }

    getStart() {
        return this.start;
    }

    getEnd() {
        return this.end;
    }

    toSamples(sampleRate) {
        return {
            start: Math.floor(this.start * sampleRate),
            end: Math.floor(this.end * sampleRate)
        };
    }
}