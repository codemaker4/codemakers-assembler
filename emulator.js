class SMPU {
    constructor() {
        this.registers = {
            'a': 0,
            'b': 0,
            'q': 0,
            'h': 0,
            'l': 0,
            'p': 0,
            's': 255,
            'c': 0,
        };
        this.devices = [];
    }

    getValue(register) {
        if (register in this.registers) {
            return this.registers[register];
        } else {
            if (register === 'r') {
                return this.getValue('h') * 256 + this.getValue('l');
            } else if (register === 'z') {
                return this.getValue('q') === 0 ? 1 : 0;
            }
        }
    }

    setValue(register, value) {
        if (!(register in this.registers)) {
            throw new Error('Invalid register: ' + register);
        }

        if (['a', 'b', 'q', 'h', 'l', 's'].includes(register)) {
            this.registers[register] = value % 256;
        } else if (register === 'p') {
            this.registers[register] = value % 65536;
        } else if (register === 'c') {
            this.registers[register] = value % 2;
        } else {
            throw new Error('Invalid register: ' + register);
        }
    }

    readDevices(addr) {
        let output = 0;
        let readFrom = [];
        for (let i = 0; i < this.devices.length; i++) {
            // OR the device output with the current output
            let data = this.devices[i].read(addr);
            output |= data[0];
            if (data[1]) {
                readFrom.push(this.devices[i]);
            }
        }
        let debugMessage = null;
        if (readFrom.length > 1) {
            debugMessage = 'WARN: Multiple devices read from at address ' + addr + '. assuming simeltaneous output, but this is likely not the case';
        }
        let status = true;
        if (readFrom.length === 0) {
            debugMessage = 'FATAL: No devices read from at address ' + addr + '. SMPU would hang here';
            status = false;
        }
        return (output, debugMessage, status);
    }

    writeDevices(addr, value) {
        let wroteTo = [];
        for (let i = 0; i < this.devices.length; i++) {
            if (this.devices[i].write(addr, value)) {
                wroteTo.push(this.devices[i]);
            }
        }
        let debugMessages = [];
        let status = true;
        if (wroteTo.length > 1) {
            debugMessages.push('WARN: Multiple devices wrote to at address ' + addr + '. assuming simeltaneous output, but this is likely not the case');
        }
        if (wroteTo.length === 0) {
            debugMessages.push('FATAL: No devices wrote to at address ' + addr + '. SMPU would hang here');
            status = false;
        }
        return (debugMessages, status);
    }

    pullAtProgramCounter() {
        let readDevices = this.readDevices(this.getValue('p'));
        let value = out[0];
        let debugMessages = out[1];
        let status = out[2];
        this.setValue('p', this.getValue('p') + 1);
        if (this.getValue('p') === 0) {
            debugMessages.push('WARN: Program counter overflowed');
        }
        return (value, debugMessages, status);
    }

    mount(device) {
        this.devices.push(device);
    }

    unmount(device) {
        this.devices = this.devices.filter((d) => d !== device);
    }

    clock() {
        let instruction = this.pullAtProgramCounter();
        return this.execute(instruction);
    }
    execute(instruction) {
        // Your instruction implementations go here
        // Use switch statement for handling different instructions
        let addr;
        let out;
        let value;
        let debugMessages;
        let status;
        let l;
        let h;
        switch (instruction) {
            case 0: // HLT
                if (DEBUG) console.log('HALT');
                return (['INFO: Halting'], false);
            case 1: // NOP
                return ([], true);
            case 2: // ADR
                h = this.pullAtProgramCounter();
                l = this.pullAtProgramCounter();
                let hDebug = h[1];
                let lDebug = l[1];
                let hStatus = h[2];
                let lStatus = l[2];
                h = h[0];
                l = l[0];
                this.setValue('h', h);
                this.setValue('l', l);
                return ([hDebug, lDebug], hStatus && lStatus);
            case 3: // LDA
                addr = this.getValue('r');
                out = this.readDevices(addr);
                value = out[0];
                debugMessages = out[1];
                status = out[2];
                this.setValue('a', value);
                return ([debugMessages], status);
            case 4: // STA
                addr = this.getValue('r');
                value = this.getValue('a');
                out = this.writeDevices(addr, value);
                debugMessages = out[0];
                status = out[1];
                return ([debugMessages], status);
            case 5: // LDB
                this.setValue('b', this.getValue('a'));
                return ([], true);
            case 6: // SWP
                let a = this.getValue('a');
                this.setValue('a', this.getValue('b'));
                this.setValue('b', a);
                return ([], true);
            case 7: // LDH
                this.setValue('h', this.getValue('a'));
                return ([], true);
            case 8: // LDL
                this.setValue('l', this.getValue('a'));
                return ([], true);
            case 9: // STH
                this.setValue('a', this.getValue('h'));
                return ([], true);
            case 10: // STL
                this.setValue('a', this.getValue('l'));
                return ([], true);
            case 11: // LDQ
                this.setValue('q', this.getValue('a'));
                return ([], true);
            case 12: // STQ
                this.setValue('a', this.getValue('q'));
                return ([], true);
            case 13: // CLA
                out = this.pullAtProgramCounter();
                value = out[0];
                debugMessages = out[1];
                status = out[2];
                this.setValue('a', value);
                return ([debugMessages], status);
            case 14: // CLB
                out = this.pullAtProgramCounter();
                value = out[0];
                debugMessages = out[1];
                status = out[2];
                this.setValue('b', value);
                return ([debugMessages], status);
            case 15: // CLQ
                out = this.pullAtProgramCounter();
                value = out[0];
                debugMessages = out[1];
                status = out[2];
                this.setValue('q', value);
                return ([debugMessages], status);
            case 20: // ADD
                result = this.getValue('a') + this.getValue('b');
                this.setValue('a', result);
                if (result > 255) {
                    this.setValue('c', 1);
                } else {
                    this.setValue('c', 0);
                }
                return ([], true);
            case 21: // ADDC
                result = this.getValue('a') + this.getValue('b') + this.getValue('c');
                this.setValue('a', result);
                if (result > 255) {
                    this.setValue('c', 1);
                } else {
                    this.setValue('c', 0);
                }
                return ([], true);
            case 22: // SUB
                result = this.getValue('a') + (this.getValue('b') ^ 0xFF) + 1;
                this.setValue('a', result);
                if (result > 255) {
                    this.setValue('c', 0);
                } else {
                    this.setValue('c', 1);
                }
                return ([], true);
            case 23: // SUBC
                result = this.getValue('a') + (this.getValue('b') ^ 0xFF) + 1 + this.getValue('c');
                this.setValue('a', result);
                if (result > 255) {
                    this.setValue('c', 0);
                } else {
                    this.setValue('c', 1);
                }
                return ([], true);
            case 24: // SHL
                result = this.getValue('a') << 1;
                this.setValue('a', result);
                if (result > 255) {
                    this.setValue('c', 1);
                } else {
                    this.setValue('c', 0);
                }
                return ([], true);
            case 25: // SHLC
                result = this.getValue('a') << 1 + this.getValue('c');
                this.setValue('a', result);
                if (result > 255) {
                    this.setValue('c', 1);
                } else {
                    this.setValue('c', 0);
                }
                return ([], true);
            case 26: // SHR
                result = this.getValue('a') >> 1;
                this.setValue('a', result);
                if (result > 255) {
                    this.setValue('c', 1);
                } else {
                    this.setValue('c', 0);
                }
                return ([], true);
            case 27: // SHRC
                result = this.getValue('a') >> 1 + this.getValue('c') * 128;
                this.setValue('a', result);
                if (result > 255) {
                    this.setValue('c', 1);
                } else {
                    this.setValue('c', 0);
                }
                return ([], true);
            case 28: // AND
                this.setValue('a', this.getValue('a') & this.getValue('b'));
                return ([], true);
            case 29: // OR
                this.setValue('a', this.getValue('a') | this.getValue('b'));
                return ([], true);
            case 30: // XOR
                this.setValue('a', this.getValue('a') ^ this.getValue('b'));
                return ([], true);
            case 31: // NAND
                this.setValue('a', (this.getValue('a') & this.getValue('b')) ^ 0xFF);
                return ([], true);
            case 32: // NOR
                this.setValue('a', (this.getValue('a') | this.getValue('b')) ^ 0xFF);
                return ([], true);
            case 33: // XNOR
                this.setValue('a', (this.getValue('a') ^ this.getValue('b')) ^ 0xFF);
                return ([], true);
            case 34: // CKSM
                result = 0;
                for (let i = 0; i < 8; i++) {
                    result += this.getValue('a') >> i & 1;
                }
                this.setValue('c', result % 2);
                return ([], true);
            case 35: // CKSMC
                result = 0;
                for (let i = 0; i < 8; i++) {
                    result += this.getValue('a') >> i & 1;
                }
                result += this.getValue('c');
                this.setValue('c', result % 2);
                return ([], true);
            case 36: // INCR
                this.setValue('q', this.getValue('q') + 1);
                return ([], true);
            case 37: // DECR
                this.setValue('q', this.getValue('q') - 1);
                return ([], true);
            case 38: // JMP
                this.setValue('p', this.getValue('r'));
                return ([], true);
            case 39: // JMPC
                if (this.getValue('c') === 1) {
                    this.setValue('p', this.getValue('r'));
                }
                return ([], true);
            case 40: // JMPZ
                if (this.getValue('z') === 1) {
                    this.setValue('p', this.getValue('r'));
                }
                return ([], true);
            case 41: // JMPQ
                if (this.getValue('z') === 0) {
                    this.setValue('p', this.getValue('r'));
                }
                return ([], true);
            case 42: // PSH
                out = this.writeDevices(this.getValue('s') + 0xFF00, this.getValue('a'));
                this.setValue('s', this.getValue('s') - 1);
                debugMessages = out[0];
                status = out[1];
                if (this.getValue('s') === 255) {
                    debugMessages.push('WARN: Stack pointer underflowed');
                }
                return ([debugMessages], status);
            case 43: // POP
                this.setValue('s', this.getValue('s') + 1);
                out = this.readDevices(this.getValue('s') + 0xFF00);
                value = out[0];
                debugMessages = out[1];
                status = out[2];
                this.setValue('a', value);
                if (this.getValue('s') === 0) {
                    debugMessages.push('WARN: Stack pointer overflowed');
                }
                return ([debugMessages], status);
            case 44: // SUBR
                debugMessages = [];
                out = this.writeDevices(this.getValue('s') + 0xFF00, this.getValue('p') / 256);
                for (let i = 0; i < out[0].length; i++) {
                    debugMessages.push(out[0][i]);
                }
                status = out[1];
                this.setValue('s', this.getValue('s') - 1);
                if (this.getValue('s') === 255) {
                    debugMessages.push('WARN: Stack pointer underflowed');
                }
                out = this.writeDevices(this.getValue('s') + 0xFF00, this.getValue('p') % 256);
                for (let i = 0; i < out[0].length; i++) {
                    debugMessages.push(out[0][i]);
                }
                status = status && out[1];
                this.setValue('s', this.getValue('s') - 1);
                if (this.getValue('s') === 255) {
                    debugMessages.push('WARN: Stack pointer underflowed');
                }
                this.setValue('p', this.getValue('r'));
                return ([debugMessages], status);
            case 45: // RET
                // #pops the address of the last subroutine instruction, first L, then H is popped (reverse from pushing, 
                // because its a stack). puts into p (program counter)
                debugMessages = [];
                this.setValue('s', this.getValue('s') + 1);
                if (this.getValue('s') === 0) {
                    debugMessages.push('WARN: Stack pointer overflowed');
                }
                l = this.readDevices(this.getValue('s') + 0xFF00);
                this.setValue('s', this.getValue('s') + 1);
                if (this.getValue('s') === 0) {
                    debugMessages.push('WARN: Stack pointer overflowed');
                }
                h = this.readDevices(this.getValue('s') + 0xFF00);
                this.setValue('p', h * 256 + l);
                for (let i = 0; i < l[1].length; i++) {
                    debugMessages.push(l[1][i]);
                }
                for (let i = 0; i < h[1].length; i++) {
                    debugMessages.push(h[1][i]);
                }
                return ([debugMessages], l[2] && h[2]);

            default:
                return ['FATAL: Invalid instruction ' + instruction + '. SMPU would hang here', false];
        }
    }
}

function shouldIgnore(addr, highBits) {
    // check if the high bits of addr are equal to highBits (i.e. addr starts with highBits)
    // if so, return false, otherwise return true

}

class ReadWriteMemory {
    constructor(nbits, highBits) {
        this.memory = new Uint8Array(2 ** nbits);
        this.highBits = highBits;
    }
    read(address) {
        return (this.memory[address % 0xFF], true);
    }
    write(address, value) {
        this.memory[address % 0xFF] = value;
        return true;
    }
}