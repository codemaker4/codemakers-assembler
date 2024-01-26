function mod(n, m) {
    return ((n % m) + m) % m;
}
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
        this.halted = false;
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
            this.registers[register] = mod(value, 256);
        } else if (register === 'p') {
            this.registers[register] = mod(value, 65536);
        } else if (register === 'c') {
            this.registers[register] = mod(value, 2);
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
        let debugMessages = [];
        if (readFrom.length > 1) {
            debugMessages = ['WARN: Multiple devices read from at address ' + addr + '. assuming simeltaneous output, but this is likely not the case'];
        }
        let status = true;
        if (readFrom.length === 0) {
            this.halted = true;
            debugMessages = ['FATAL: No devices read from at address ' + addr + '. SMPU would hang here'];
            status = false;
        }
        return [output, debugMessages, status];
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
            this.halted = true;
            debugMessages.push('FATAL: No devices wrote to at address ' + addr + '. SMPU would hang here');
            status = false;
        }
        return [debugMessages, status];
    }

    pullAtProgramCounter() {
        let readDevices = this.readDevices(this.getValue('p'));
        let value = readDevices[0];
        let debugMessages = readDevices[1];
        let status = readDevices[2];
        this.setValue('p', this.getValue('p') + 1);
        if (this.getValue('p') === 0) {
            debugMessages.push('WARN: Program counter overflowed');
        }
        return [value, debugMessages, status];
    }

    mount(device) {
        this.devices.push(device);
    }

    unmount(device) {
        this.devices = this.devices.filter((d) => d !== device);
    }

    clock() {
        if (this.halted) {
            return [[], false];
        }
        let prun = this.getValue('p');
        let out = this.pullAtProgramCounter();
        let instruction = out[0];
        let debugMessages = out[1];
        let status = out[2];
        if (!status) {
            return [debugMessages, status];
        }
        let execOut = this.execute(instruction);
        for (let i = 0; i < execOut[0].length; i++) {
            debugMessages.push(execOut[0][i]);
        }
        return [debugMessages, execOut[1]];
    }
    execute(instruction) {
        // Your instruction implementations go here
        // Use switch statement for handling different instructions
        let addr;
        let out;
        let value;
        let debugMessages;
        let status;
        let result;
        let l;
        let h;
        switch (instruction) {
            case 0: // HLT
                this.halted = true;
                return [['INFO: Halting'], false];
            case 1: // NOP
                return [[], true];
            case 2: // ADR
                h = this.pullAtProgramCounter();
                l = this.pullAtProgramCounter();
                debugMessages = h[1];
                for (let i = 0; i < l[1].length; i++) {
                    debugMessages.push(l[1][i]);
                }
                let hStatus = h[2];
                let lStatus = l[2];
                h = h[0];
                l = l[0];
                this.setValue('h', h);
                this.setValue('l', l);
                return [debugMessages, hStatus && lStatus];
            case 3: // LDA
                addr = this.getValue('r');
                out = this.readDevices(addr);
                value = out[0];
                debugMessages = out[1];
                status = out[2];
                this.setValue('a', value);
                return [debugMessages, status];
            case 4: // STA
                addr = this.getValue('r');
                value = this.getValue('a');
                out = this.writeDevices(addr, value);
                debugMessages = out[0];
                status = out[1];
                return [debugMessages, status];
            case 5: // LDB
                this.setValue('b', this.getValue('a'));
                return [[], true];
            case 6: // SWP
                let a = this.getValue('a');
                this.setValue('a', this.getValue('b'));
                this.setValue('b', a);
                return [[], true];
            case 7: // LDH
                this.setValue('h', this.getValue('a'));
                return [[], true];
            case 8: // LDL
                this.setValue('l', this.getValue('a'));
                return [[], true];
            case 9: // STH
                this.setValue('a', this.getValue('h'));
                return [[], true];
            case 10: // STL
                this.setValue('a', this.getValue('l'));
                return [[], true];
            case 11: // LDQ
                this.setValue('q', this.getValue('a'));
                return [[], true];
            case 12: // STQ
                this.setValue('a', this.getValue('q'));
                return [[], true];
            case 13: // CLA
                out = this.pullAtProgramCounter();
                value = out[0];
                debugMessages = out[1];
                status = out[2];
                this.setValue('a', value);
                return [debugMessages, status];
            case 14: // CLB
                out = this.pullAtProgramCounter();
                value = out[0];
                debugMessages = out[1];
                status = out[2];
                this.setValue('b', value);
                return [debugMessages, status];
            case 15: // CLQ
                out = this.pullAtProgramCounter();
                value = out[0];
                debugMessages = out[1];
                status = out[2];
                this.setValue('q', value);
                return [debugMessages, status];
                result = this.getValue('a') + this.getValue('b');
                this.setValue('a', result);
                if (result > 255) {
                    this.setValue('c', 1);
                } else {
                    this.setValue('c', 0);
                }
                return [[], true];
            case 20: // ADD
                result = this.getValue('a') + this.getValue('b');
                this.setValue('a', result);
                if (result > 255) {
                    this.setValue('c', 1);
                } else {
                    this.setValue('c', 0);
                }
                return [[], true];
            case 21: // ADDC
                result = this.getValue('a') + this.getValue('b') + this.getValue('c');
                this.setValue('a', result);
                if (result > 255) {
                    this.setValue('c', 1);
                } else {
                    this.setValue('c', 0);
                }
                return [[], true];
            case 22: // SUB
                result = this.getValue('a') + (this.getValue('b') ^ 0xFF) + 1;
                this.setValue('a', result);
                if (result > 255) {
                    this.setValue('c', 1);
                } else {
                    this.setValue('c', 0);
                }
                return [[], true];
            case 23: // SUBC
                result = this.getValue('a') + (this.getValue('b') ^ 0xFF) + 1 - this.getValue('c');
                this.setValue('a', result);
                if (result > 255) {
                    this.setValue('c', 1);
                } else {
                    this.setValue('c', 0);
                }
                return [[], true];
            case 24: // SHL
                result = this.getValue('a') << 1;
                this.setValue('a', result);
                if (result > 255) {
                    this.setValue('c', 1);
                } else {
                    this.setValue('c', 0);
                }
                return [[], true];
            case 25: // SHLC
                result = this.getValue('a') << 1 + this.getValue('c');
                this.setValue('a', result);
                if (result > 255) {
                    this.setValue('c', 1);
                } else {
                    this.setValue('c', 0);
                }
                return [[], true];
            case 26: // SHR
                result = this.getValue('a') >> 1;
                this.setValue('a', result);
                if (result > 255) {
                    this.setValue('c', 1);
                } else {
                    this.setValue('c', 0);
                }
                return [[], true];
            case 27: // SHRC
                result = this.getValue('a') >> 1 + this.getValue('c') * 128;
                this.setValue('a', result);
                if (result > 255) {
                    this.setValue('c', 1);
                } else {
                    this.setValue('c', 0);
                }
                return [[], true];
            case 28: // AND
                this.setValue('a', this.getValue('a') & this.getValue('b'));
                return [[], true];
            case 29: // OR
                this.setValue('a', this.getValue('a') | this.getValue('b'));
                return [[], true];
            case 30: // XOR
                this.setValue('a', this.getValue('a') ^ this.getValue('b'));
                return [[], true];
            case 31: // NAND
                this.setValue('a', (this.getValue('a') & this.getValue('b')) ^ 0xFF);
                return [[], true];
            case 32: // NOR
                this.setValue('a', (this.getValue('a') | this.getValue('b')) ^ 0xFF);
                return [[], true];
            case 33: // XNOR
                this.setValue('a', (this.getValue('a') ^ this.getValue('b')) ^ 0xFF);
                return [[], true];
            case 34: // CKSM
                result = 0;
                for (let i = 0; i < 8; i++) {
                    result += this.getValue('a') >> i & 1;
                }
                this.setValue('c', mod(result, 2));
                return [[], true];
            case 35: // CKSMC
                result = 0;
                for (let i = 0; i < 8; i++) {
                    result += this.getValue('a') >> i & 1;
                }
                result += this.getValue('c');
                this.setValue('c', mod(result, 2));
                return [[], true];
            case 36: // INCR
                this.setValue('q', this.getValue('q') + 1);
                return [[], true];
            case 37: // DECR
                this.setValue('q', this.getValue('q') - 1);
                return [[], true];
            case 38: // JMP
                this.setValue('p', this.getValue('r'));
                return [[], true];
            case 39: // JMPC
                if (this.getValue('c') === 1) {
                    this.setValue('p', this.getValue('r'));
                }
                return [[], true];
            case 40: // JMPZ
                if (this.getValue('z') === 1) {
                    this.setValue('p', this.getValue('r'));
                }
                return [[], true];
            case 41: // JMPQ
                if (this.getValue('z') === 0) {
                    this.setValue('p', this.getValue('r'));
                }
                return [[], true];
            case 42: // PSH
                out = this.writeDevices(this.getValue('s') + 0xFF00, this.getValue('a'));
                this.setValue('s', this.getValue('s') - 1);
                debugMessages = out[0];
                status = out[1];
                if (this.getValue('s') === 255) {
                    debugMessages.push('WARN: Stack pointer underflowed');
                }
                return [debugMessages, status];
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
                return [debugMessages, status];
            case 44: // SUBR
                debugMessages = [];
                out = this.writeDevices(this.getValue('s') + 0xFF00, Math.floor(this.getValue('p') / 256));
                for (let i = 0; i < out[0].length; i++) {
                    debugMessages.push(out[0][i]);
                }
                status = out[1];
                this.setValue('s', this.getValue('s') - 1);
                if (this.getValue('s') === 255) {
                    debugMessages.push('WARN: Stack pointer underflowed');
                }
                out = this.writeDevices(this.getValue('s') + 0xFF00, mod(this.getValue('p'), 256));
                for (let i = 0; i < out[0].length; i++) {
                    debugMessages.push(out[0][i]);
                }
                status = status && out[1];
                this.setValue('s', this.getValue('s') - 1);
                if (this.getValue('s') === 255) {
                    debugMessages.push('WARN: Stack pointer underflowed');
                }
                this.setValue('p', this.getValue('r'));
                return [debugMessages, status];
            case 45: // RET
                // #pops the address of the last subroutine instruction, first L, then H is popped (reverse from pushing,
                // because its a stack). puts into p (program counter)
                debugMessages = [];
                this.setValue('s', this.getValue('s') + 1);
                if (this.getValue('s') === 0) {
                    debugMessages.push('WARN: Stack pointer overflowed');
                }
                l = this.readDevices(this.getValue('s') + 0xFF00);
                console.log(this.getValue('s'), l);
                this.setValue('s', this.getValue('s') + 1);
                if (this.getValue('s') === 0) {
                    debugMessages.push('WARN: Stack pointer overflowed');
                }
                h = this.readDevices(this.getValue('s') + 0xFF00);
                console.log(this.getValue('s'), h);
                for (let i = 0; i < l[1].length; i++) {
                    debugMessages.push(l[1][i]);
                }
                for (let i = 0; i < h[1].length; i++) {
                    debugMessages.push(h[1][i]);
                }
                this.setValue('p', h[0] * 256 + l[0]);
                return [debugMessages, l[2] && h[2]];

            default:
                this.halted = true;
                return [['FATAL: Invalid instruction ' + instruction + '. SMPU would hang here'], false];
        }
    }
}

function shouldIgnore(addr, highBits) {
    // check if the high bits of addr are equal to highBits (i.e. addr starts with highBits)
    // if so, return false, otherwise return true
    // essentially, this function returns true if the address is not in the range specified by highBits
    let addrBinary = addr.toString(2).padStart(16, '0');
    return addrBinary.slice(0, highBits.length) !== highBits;
}

class ReadWriteMemory {
    // this class is used to represent a memory device
    // it is a simple memory device that can read and write to an array of bytes
    constructor(nbits) {
        this.nbits = nbits;
        this.memory = new Uint8Array(2 ** nbits);
        this.table = null;
        this.toUpdateInTable = [];
    }
    read(address) {
        return [this.memory[mod(address, (2 ** this.nbits))], true];
    }
    write(address, value) {
        this.memory[mod(address, (2 ** this.nbits))] = value;
        if (this.table !== null) {
            this.toUpdateInTable.push(mod(address, (2 ** this.nbits)));
        }
        return true;
    }
    reset() {
        this.memory = new Uint8Array(this.memory.length);
        this.table = null;
    }
    infoScreen() {
        if (this.table === null) {
            this.table = document.createElement('table');
            this.table.classList.add('dataTable');
            let tr = document.createElement('tr');
            let td = document.createElement('td');
            td.innerText = 'Addr';
            tr.appendChild(td);
            td = document.createElement('td');
            td.innerText = 'Val';
            tr.appendChild(td);
            this.table.appendChild(tr);
            // create table
            for (let i = 0; i < this.memory.length; i++) {
                tr = document.createElement('tr');
                td = document.createElement('td');
                td.innerText = i;
                tr.appendChild(td);
                td = document.createElement('td');
                if (this.memory[i] === 0) {
                    // special case for 0
                    td.classList.add('darkZero');
                    td.innerText = "(0) 00000000";
                } else {
                    // split into spans (for coloring)
                    let span = document.createElement('span');
                    span.innerText = "(" + this.memory[i] + ") ";
                    td.appendChild(span);
                    let splitList = [];
                    let memoryString = this.memory[i].toString(2).padStart(8, '0');
                    let currentSplit = memoryString[0];
                    let currentSplitLength = 1;
                    for (let j = 1; j < 8; j++) {
                        if (memoryString[j] === currentSplit) {
                            currentSplitLength++;
                        }
                        else {
                            splitList.push([currentSplit, currentSplitLength]);
                            currentSplit = memoryString[j];
                            currentSplitLength = 1;
                        }
                    }
                    splitList.push([currentSplit, currentSplitLength]);
                    // create spans
                    for (let j = 0; j < splitList.length; j++) {
                        let span = document.createElement('span');
                        span.innerText = splitList[j][0].repeat(splitList[j][1]);
                        if (splitList[j][0] === '0') {
                            span.classList.add('darkZero');
                        }
                        td.appendChild(span);
                    }
                }
                tr.appendChild(td);
                this.table.appendChild(tr);
            }
            return this.table.outerHTML;
        } else {
            for (let i = 0; i < this.toUpdateInTable.length; i++) {
                // update table elements that have changed
                let addr = this.toUpdateInTable[i];
                let tr = this.table.children[addr + 1];
                let td = tr.children[1];
                if (this.memory[addr] === 0) {
                    // special case for 0
                    td.classList.add('darkZero');
                    td.innerText = "(0) 00000000";
                } else {
                    td.classList.remove('darkZero');
                    // split into spans (for coloring)
                    let span = document.createElement('span');
                    span.innerText = "(" + this.memory[addr] + ") ";
                    td.innerText = "";
                    td.appendChild(span);
                    let splitList = [];
                    let memoryString = this.memory[addr].toString(2).padStart(8, '0');
                    let currentSplit = memoryString[0];
                    let currentSplitLength = 1;
                    for (let j = 1; j < 8; j++) {
                        if (memoryString[j] === currentSplit) {
                            currentSplitLength++;
                        }
                        else {
                            splitList.push([currentSplit, currentSplitLength]);
                            currentSplit = memoryString[j];
                            currentSplitLength = 1;
                        }
                    }
                    splitList.push([currentSplit, currentSplitLength]);
                    // create spans
                    for (let j = 0; j < splitList.length; j++) {
                        let span = document.createElement('span');
                        span.innerText = splitList[j][0].repeat(splitList[j][1]);
                        if (splitList[j][0] === '0') {
                            span.classList.add('darkZero');
                        }
                        td.appendChild(span);
                    }
                }
            }
            this.toUpdateInTable = [];
            return this.table.outerHTML;
        }
    }
    setNBits(nbits) {
        this.table = null;
        // set the number of bits in the memory
        if (nbits === this.nbits) {
            return;
        }
        this.nbits = nbits;
        let newMemory = new Uint8Array(2 ** nbits);
        for (let i = 0; i < Math.min(this.memory.length, newMemory.length); i++) {
            newMemory[i] = this.memory[i];
        }
        this.memory = newMemory;
        updateDisplay();
    }
}

class RangeLimiter {
    // this class is used to limit the range of addresses that a device can read/write to
    constructor(device, rangeLimit, highBits) {
        this.device = device;
        this.rangeLimit = rangeLimit;
        this.highBits = highBits;
    }
    read(address) {
        if (!this.rangeLimit) {
            return this.device.read(address);
        }
        if (shouldIgnore(address, this.highBits)) {
            return [0, false];
        }
        return this.device.read(address);
    }
    write(address, value) {
        if (!this.rangeLimit) {
            return this.device.write(address, value);
        }
        if (shouldIgnore(address, this.highBits)) {
            return false;
        }
        return this.device.write(address, value);
    }
    reset() {
        this.device.reset();
    }
    setNewDevice(device) {
        this.device = device;
    }
    setRangeLimitEnabled(rangeLimit) {
        this.rangeLimit = rangeLimit;
    }
    setHighBits(highBits) {
        this.highBits = highBits;
    }
}

function toggleEmulatorDrawer() {
    var drawer = document.getElementById
        ("emulationDrawer");
    drawer.classList.toggle('expanded');
}

let clockInterval = null;
let smpu = new SMPU();
let devices = [];

function restartEmulator() {
    // this function is called to restart the emulator
    // it resets the SMPU and mounts all devices
    // it also writes the compiled code to memory
    if (clockInterval !== null) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
    smpu = new SMPU();
    for (let i = 0; i < devices.length; i++) {
        let device = devices[i];
        device.reset()
    }
    for (let i = 0; i < devices.length; i++) {
        smpu.mount(devices[i]);
    }
    // write compiled code to memory
    let data = compiler.export();
    if (data === undefined || data.length == 0) {
        return;
    }
    for (let i = 0; i < data.length; i++) {
        const byte = data[i];
        smpu.writeDevices(byte[0], byte[1]);
    }
    // clear debug console
    document.getElementById('debugConsole').innerText = 'INFO: Emulator restarted\n';
    // reset clock icon
    clockIndex = 0;
    document.getElementById('clockIcon').innerText = clockIcons[clockIndex];
    updateDisplay();
}

let clockIcons = [..."🕛🕐🕑🕒🕓🕔🕕🕖🕗🕘🕙🕚"];
let clockIndex = 0;
let lastUpdate = 0;

function runOneClock() {
    // this function is called to run one clock cycle of the computer
    if (!smpu.halted) {
        clockIndex = (clockIndex + 1) % clockIcons.length;
        document.getElementById('clockIcon').innerText = clockIcons[clockIndex];
    }
    const initialP = smpu.getValue('p');
    let out = smpu.clock();
    if (clockInterval === null || Date.now() - lastUpdate > 200) {
        updateDisplay();
        lastUpdate = Date.now();
    }
    const debugConsole = document.getElementById('debugConsole');
    for (let i = 0; i < out[0].length; i++) {
        debugConsole.innerText += "[" + initialP + "] " + out[0][i] + '\n';
    }
    let status = out[1]; // whether the computer has halted
    if (!status && clockInterval !== null) {
        clearInterval(clockInterval);
        clockInterval = null;
        updateDisplay();
    }
}

let outputtingInfo = null;
let outputtingInfoType = null;

function setInfoWrite(type, device) {
    outputtingInfo = device;
    outputtingInfoType = type;
}

function createDevice() {
    let deviceType = document.getElementById('createDeviceType').value;
    createDeviceWithType(deviceType);
}

function createDeviceWithType(deviceType) {
    let device;
    let card;
    let titleValue = deviceType;
    let includeInfoButton = false;
    // each device has a card with a title, a delete button, (and an info button is optional)
    // along with some other stuff depending on the device type

    card = document.createElement('div');
    card.classList.add('device-card');

    if (deviceType === 'memory') {
        titleValue = 'Memory';
        let memory = new ReadWriteMemory(6);
        device = new RangeLimiter(memory, false, "0");
        let nBits = document.createElement('input');
        nBits.type = 'number';
        nBits.min = 1;
        nBits.max = 16;
        nBits.value = 6;
        nBits.onchange = function () {
            memory.setNBits(nBits.value);
            updateDisplay();
        }
        card.appendChild(nBits);
        includeInfoButton = true;
    }

    let title = document.createElement('strong');
    title.innerText = titleValue;
    card.appendChild(title);

    let deleteButton = document.createElement('span');
    deleteButton.innerText = '❌';
    deleteButton.classList.add('text-button');
    deleteButton.onclick = function () {
        smpu.unmount(device);
        card.remove();
        if (outputtingInfo === device.device) {
            outputtingInfo = null;
            outputtingInfoType = null;
            updateDisplay();
        }
        devices = devices.filter((d) => d !== device);
    }
    card.appendChild(deleteButton);

    if (includeInfoButton) {
        let infoButton = document.createElement('span');
        infoButton.innerText = '(i)';
        infoButton.classList.add('text-button');
        infoButton.onclick = function () {
            setInfoWrite(deviceType, device.device);
            updateDisplay();
        }
        card.appendChild(infoButton);
    }
    card.appendChild(document.createElement('br'));

    let rangeLimit = document.createElement('input');
    rangeLimit.type = 'checkbox';
    rangeLimit.id = 'rangeLimit';
    rangeLimit.checked = false;
    let highBits = document.createElement('input');
    rangeLimit.onchange = function () {
        highBits.disabled = !rangeLimit.checked;
        device.setRangeLimitEnabled(rangeLimit.checked);
    }
    card.appendChild(rangeLimit);

    let rangeLimitLabel = document.createElement('label');
    rangeLimitLabel.innerText = 'Range limit';
    rangeLimitLabel.htmlFor = 'rangeLimit';
    card.appendChild(rangeLimitLabel);

    card.appendChild(document.createElement('br'));

    highBits.type = 'text';
    highBits.id = 'highBits';
    highBits.disabled = true;
    highBits.placeholder = 'High bits';
    highBits.onchange = function () {
        // limit to allowed characters (0 and 1)
        let value = rangeLimit.checked ? highBits.value.replace(/[^01]/g, '') : '';
        highBits.value = value;
        device.setHighBits(highBits.value);
    }
    card.appendChild(highBits);

    document.getElementById('devices').appendChild(card);
    smpu.mount(device);
    devices.push(device);
    updateDisplay();
}

document.addEventListener('DOMContentLoaded', function () {
    createDeviceWithType('memory');
});

function autoClock() {
    if (clockInterval === null) {
        clockInterval = setInterval(runOneClock, 10);
    } else {
        clearInterval(clockInterval);
        clockInterval = null;
        updateDisplay();
    }
}

function updateDisplay() {
    // update the display of the emulator
    document.getElementById('register-A').innerHTML = smpu.getValue('a');
    document.getElementById('register-A-bin').innerHTML = smpu.getValue('a').toString(2).padStart(8, '0');
    document.getElementById('register-B').innerHTML = smpu.getValue('b');
    document.getElementById('register-B-bin').innerHTML = smpu.getValue('b').toString(2).padStart(8, '0');
    document.getElementById('register-Q').innerHTML = smpu.getValue('q');
    document.getElementById('register-Q-bin').innerHTML = smpu.getValue('q').toString(2).padStart(8, '0');
    document.getElementById('register-H').innerHTML = smpu.getValue('h');
    document.getElementById('register-H-bin').innerHTML = smpu.getValue('h').toString(2).padStart(8, '0');
    document.getElementById('register-L').innerHTML = smpu.getValue('l');
    document.getElementById('register-L-bin').innerHTML = smpu.getValue('l').toString(2).padStart(8, '0');
    document.getElementById('register-P').innerHTML = smpu.getValue('p');
    document.getElementById('register-P-bin').innerHTML = smpu.getValue('p').toString(2).padStart(16, '0');
    document.getElementById('register-S').innerHTML = smpu.getValue('s');
    document.getElementById('register-S-bin').innerHTML = smpu.getValue('s').toString(2).padStart(8, '0');
    document.getElementById('register-C').innerHTML = smpu.getValue('c');
    document.getElementById('register-C-bin').innerHTML = smpu.getValue('c').toString(2).padStart(1, '0');
    // update device info
    const deviceInfo = document.getElementById('deviceInfo');
    if (outputtingInfoType === null) {
        deviceInfo.style.display = 'none';
    } else {
        deviceInfo.style.display = 'block';
        deviceInfo.innerHTML = outputtingInfo.infoScreen();
    }
}