document.addEventListener('DOMContentLoaded', () => {
    const tagTypeSelect = document.getElementById('tagType');
    const inputDataField = document.getElementById('inputData');
    const generateButton = document.getElementById('generateButton');
    const outputSection = document.getElementById('outputSection');
    const nfcDataOutput = document.getElementById('nfcData');
    const downloadButton = document.getElementById('downloadButton');
    const themeToggle = document.getElementById('themeToggle');

    function updatePlaceholder() {
        const placeholders = {
            'URL': 'https://example.com',
            'Phone': '+1234567890',
            'Text': 'Enter your text here',
            'Email': 'example@email.com'
        };
        inputDataField.placeholder = placeholders[tagTypeSelect.value] || 'Enter data';
    }

    class nfcHelper {
        constructor() {
            this.exceptionOnError = true;
            this.errorFlag = false;
        }

        error(funcName, msg) {
            console.log('nfcHelper-Error-' + funcName + '-' + msg);
        }

        throwException(msg, ret = false) {
            if (this.exceptionOnError) console.log(msg);
            this.errorFlag = !ret;
            return ret;
        }

        upper(val) {
            return (val && typeof val === 'string') ? val.toUpperCase().trim() : this.error('upper', typeof val);
        }

        randomHex(size) {
            return [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        }

        hexStr_to_byteArray(hex) {
            return hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
        }

        byteArray_to_hexStr(buffer) {
            return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
        }

        byteArray_to_hexStr_Split(x) {
            return this.byteArray_to_hexStr(x).match(/.{1,2}/g).join(' ');
        }

        string_to_bytes(x) {
            return x.split('').map(c => c.charCodeAt(0));
        }
    }

    class nfcNTAG {
        constructor(nfcDeviceType = 'NTAG215') {
            this.helper = new nfcHelper();
            this.nfcDeviceType = this.validDeviceType(nfcDeviceType);
            this.nfcPages = Array.from({length: this.getNfcPageCount()}, () => Array(4).fill(0));
            this.nfcUID = '04' + this.helper.randomHex(12);
            this.errorFlag = false;
        }
        validDeviceType(nfcDeviceType) {
            nfcDeviceType = this.helper.upper(nfcDeviceType);
            const validTypes = ['NTAG213', 'NTAG215', 'NTAG216'];
            return validTypes.includes(nfcDeviceType) ? nfcDeviceType : this.helper.throwException('Error: Invalid device type');
        }

        getNfcPageCount() {
            const pageCounts = {'NTAG213': 45, 'NTAG215': 135, 'NTAG216': 231};
            return pageCounts[this.nfcDeviceType] || this.helper.throwException('Error: Invalid device type');
        }

        generateHeader() {
            return `Filetype: Flipper NFC device
Version: 4
# Device type can be ISO14443-3A, ISO14443-3B, ISO14443-4A, ISO14443-4B, ISO15693-3, FeliCa, NTAG/Ultralight, Mifare Classic, Mifare Plus, Mifare DESFire, SLIX, ST25TB, EMV
Device type: NTAG/Ultralight
# UID is common for all formats
UID: ${this.helper.byteArray_to_hexStr_Split(this.helper.hexStr_to_byteArray(this.nfcUID))}
# ISO14443-3A specific data
ATQA: 00 44
SAK: 00
# NTAG/Ultralight specific data
Data format version: 2
NTAG/Ultralight type: ${this.nfcDeviceType}
Signature: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
Mifare version: 00 04 04 02 01 00 11 03
Counter 0: 0
Tearing 0: 00
Counter 1: 0
Tearing 1: 00
Counter 2: 0
Tearing 2: 00
Pages total: ${this.getNfcPageCount()}
Pages read: ${this.getNfcPageCount()}`;
        }

        generate() {
            const uidBytes = this.helper.hexStr_to_byteArray(this.nfcUID);
            for (let i = 0; i < 3; i++) {
                this.nfcPages[0][i] = uidBytes[i];
            }
            this.nfcPages[0][3] = uidBytes[0] ^ uidBytes[1] ^ uidBytes[2]; // BCC0
            this.nfcPages[1] = [...uidBytes.slice(3, 7)]; // UID bytes 4-7
            this.nfcPages[2] = [
                uidBytes[3] ^ uidBytes[4] ^ uidBytes[5] ^ uidBytes[6], // BCC1
                0x48, 0x00, 0x00
            ]; 
            this.nfcPages[3] = [0xE1, 0x10, 0x6D, 0x00]; // Capability Container for NTAG215
        }
        
        NDEF_URI_URL(data, type = 'URL') {
            const uriPrefixes = {
                'http://www.': 0x01,
                'https://www.': 0x02,
                'http://': 0x03,
                'https://': 0x04,
                'tel:': 0x05,
                'mailto:': 0x06
            };
        
            let payload;
            let recordType;
        
            if (type === 'URL') {
                let prefix = Object.keys(uriPrefixes).find(key => data.toLowerCase().startsWith(key)) || '';
                let prefixCode = uriPrefixes[prefix] || 0x00;
                data = data.slice(prefix.length);
                payload = [prefixCode, ...this.helper.string_to_bytes(data)];
                recordType = 0x55; // 'U' for URI
            } else if (type === 'Phone') {
                payload = [0x05, ...this.helper.string_to_bytes(data)]; // 0x05 is the prefix for 'tel:'
                recordType = 0x55; // 'U' for URI
            } else if (type === 'Text') {
                payload = [0x02, 0x65, 0x6E, ...this.helper.string_to_bytes(data)]; // 0x02 for UTF-8, 'en' for English
                recordType = 0x54; // 'T' for Text
            } else {
                throw new Error('Unsupported data type');
            }
        
            let payloadLength = payload.length;
        
            let ndefMessage = [
                0x03,                   // NDEF Message TLV Tag
                payloadLength + 5,      // Length of the NDEF message
                0xD1,                   // Record Header (MB=1, ME=1, CF=0, SR=1, IL=0, TNF=001)
                0x01,                   // Type Length (1 byte)
                payloadLength,          // Payload Length
                recordType,             // Type ('U' for URI or 'T' for Text)
                ...payload,             // Payload
                0xFE                    // NDEF Message End TLV
            ];
            
            let pageIndex = 4;
            let byteIndex = 0;
            ndefMessage.forEach(byte => {
                this.nfcPages[pageIndex][byteIndex] = byte;
                byteIndex++;
                if (byteIndex === 4) {
                    pageIndex++;
                    byteIndex = 0;
                }
            });
        
            // Fill the rest of the last page with zeros
            while (byteIndex < 4) {
                this.nfcPages[pageIndex][byteIndex] = 0x00;
                byteIndex++;
            }
        }
    

        generatePages() {
            return this.nfcPages.map((page, index) => 
                `Page ${index}: ${page.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ')}`
            ).join('\n');
        }

        generate_TAG_URL(data, type = 'URL') {
            this.nfcUID = '04' + this.helper.randomHex(12);
            this.generate();
            this.NDEF_URI_URL(data, type);
            
            // Set specific end pages
            this.nfcPages[130] = [0x00, 0x00, 0x00, 0xBD];
            this.nfcPages[131] = [0x04, 0x00, 0x00, 0xFF];
            this.nfcPages[132] = [0x00, 0x05, 0x00, 0x00];
            this.nfcPages[133] = [0xFF, 0xFF, 0xFF, 0xFF];
            this.nfcPages[134] = [0x00, 0x00, 0x00, 0x00];
        
            const header = this.generateHeader();
            const pages = this.generatePages();
            return header + '\n' + pages + '\nFailed authentication attempts: 0\n';
        }
    }

    function generateNFCData() {
        const inputData = inputDataField.value;
        const selectedType = tagTypeSelect.value;
    
        if (!inputData) {
            alert('Please enter data');
            return;
        }
    
        const nfcTag = new nfcNTAG('NTAG215');
        const nfcData = nfcTag.generate_TAG_URL(inputData, selectedType);
    
        nfcDataOutput.textContent = nfcData;
        outputSection.classList.remove('hidden');
    }
    function downloadNFCFile() {
        const nfcData = nfcDataOutput.textContent;
        const blob = new Blob([nfcData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Generate a filename based on the input data and tag type
        const inputData = inputDataField.value;
        const tagType = tagTypeSelect.value;
        let filename = 'nfc_tag';
        
        if (inputData) {
            // Sanitize the input data for use in filename
            const sanitizedData = inputData.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            filename = `${tagType}_${sanitizedData}`.substring(0, 50); // Limit length to 50 characters
        }
        
        a.download = `${filename}.nfc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function toggleTheme() {
        document.body.classList.toggle('dark-theme');
    }

    tagTypeSelect.addEventListener('change', updatePlaceholder);
    generateButton.addEventListener('click', generateNFCData);
    downloadButton.addEventListener('click', downloadNFCFile);
    themeToggle.addEventListener('click', toggleTheme);

    updatePlaceholder();
});