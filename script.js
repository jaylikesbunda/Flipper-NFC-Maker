document.addEventListener('DOMContentLoaded', () => {
    const tagTypeSelect = document.getElementById('tagType');
    const nfcTagTypeSelect = document.getElementById('nfcTagTypeSelect');
    const generateButton = document.getElementById('generateButton');
    const outputSection = document.getElementById('outputSection');
    const nfcDataOutput = document.getElementById('nfcData');
    const downloadButton = document.getElementById('downloadButton');
    const themeToggle = document.getElementById('themeToggle');

    const inputFieldsContainer = document.getElementById('inputFields');
    const allInputGroups = inputFieldsContainer.querySelectorAll('.data-field');

    // Map of input elements
    const inputs = {
        urlInput: document.getElementById('urlInput'),
        textInput: document.getElementById('textInput'),
        phoneInput: document.getElementById('phoneInput'),
        emailInput: document.getElementById('emailInput'),
        ssidInput: document.getElementById('ssidInput'),
        passwordInput: document.getElementById('passwordInput'),
        authTypeSelect: document.getElementById('authTypeSelect'),
        contactInput: document.getElementById('contactInput'),
        latitudeInput: document.getElementById('latitudeInput'),
        longitudeInput: document.getElementById('longitudeInput'),
        smsNumberInput: document.getElementById('smsNumberInput'),
        smsBodyInput: document.getElementById('smsBodyInput'),
        packageNameInput: document.getElementById('packageNameInput'),
        mimeTypeInput: document.getElementById('mimeTypeInput'),
        mimeDataInput: document.getElementById('mimeDataInput')
    };

    function showRelevantInputs() {
        const selectedType = tagTypeSelect.value;

        // Hide all input groups
        allInputGroups.forEach(group => group.style.display = 'none');

        // Show input groups that match the selected type
        allInputGroups.forEach(group => {
            const types = group.getAttribute('data-type').split(' ');
            if (types.includes(selectedType)) {
                group.style.display = 'block';
            }
        });
    }


    function updatePlaceholder() {
        const placeholders = {
            'URL': 'https://example.com',
            'Phone': '+1234567890',
            'Text': 'Enter your text here',
            'Email': 'example@example.com',
            'WiFi': 'SSID:YourNetwork;PASSWORD:YourPassword;AUTH:WPA',
            'Contact': 'BEGIN:VCARD\nVERSION:3.0\nN:John Doe\nTEL:+1234567890\nEMAIL:john@example.com\nEND:VCARD',
            'Geo': 'geo:37.7749,-122.4194',
            'SMS': 'sms:+1234567890?body=Hello%20World',
            'LaunchApp': 'com.example.myapp',
            'CustomMIME': 'application/myapp\nYour custom data here',
            'SocialMedia': 'https://twitter.com/yourprofile'
        };
        inputDataField.placeholder = placeholders[tagTypeSelect.value] || 'Enter data';
    }

    class nfcHelper {
        constructor() {}

        throwException(msg) {
            throw new Error(msg);
        }

        upper(val) {
            if (val && typeof val === 'string') {
                return val.toUpperCase().trim();
            } else {
                throw new Error(`Invalid input: Expected string, got ${typeof val}`);
            }
        }

        randomHex(size) {
            return [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        }

        hexStr_to_byteArray(hex) {
            if (!hex || typeof hex !== 'string') {
                throw new Error('Invalid hex string');
            }
            return hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
        }

        byteArray_to_hexStr(buffer) {
            return [...buffer].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
        }

        byteArray_to_hexStr_Split(x) {
            return x.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');
        }

        string_to_bytes(x) {
            return x.split('').map(c => c.charCodeAt(0));
        }
    }

    class nfcNTAG {
        constructor(nfcDeviceType = 'NTAG215') {
            this.helper = new nfcHelper();
            this.nfcDeviceType = this.validDeviceType(nfcDeviceType);
            this.nfcPages = Array.from({ length: this.getNfcPageCount() }, () => Array(4).fill(0));
            this.nfcUID = this.generateUID();
        }

        validDeviceType(nfcDeviceType) {
            nfcDeviceType = this.helper.upper(nfcDeviceType);
            const validTypes = ['NTAG213', 'NTAG215', 'NTAG216'];
            if (validTypes.includes(nfcDeviceType)) {
                return nfcDeviceType;
            } else {
                this.helper.throwException('Error: Invalid device type');
            }
        }

        getNfcPageCount() {
            const pageCounts = { 'NTAG213': 45, 'NTAG215': 135, 'NTAG216': 231 };
            if (this.nfcDeviceType in pageCounts) {
                return pageCounts[this.nfcDeviceType];
            } else {
                this.helper.throwException('Error: Invalid device type');
            }
        }

        generateUID() {
            // Generate a UID based on NFC Forum specifications
            const uid0 = 0x04; // NXP manufacturer code
            const uidRest = this.helper.hexStr_to_byteArray(this.helper.randomHex(12)); // 6 bytes
            const uid = [uid0, ...uidRest]; // Total 7 bytes
            return uid;
        }

        generateHeader() {
            return `Filetype: Flipper NFC device
Version: 4
# Device type can be ISO14443-3A, ISO14443-3B, ISO14443-4A, ISO14443-4B, ISO15693-3, FeliCa, NTAG/Ultralight, Mifare Classic, Mifare Plus, Mifare DESFire, SLIX, ST25TB, EMV
Device type: NTAG/Ultralight
# UID is common for all formats
UID: ${this.helper.byteArray_to_hexStr_Split(this.nfcUID)}
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
            const uid = this.nfcUID;
            // Set UID and BCC0 in page 0
            this.nfcPages[0][0] = uid[0];
            this.nfcPages[0][1] = uid[1];
            this.nfcPages[0][2] = uid[2];
            this.nfcPages[0][3] = uid[0] ^ uid[1] ^ uid[2]; // BCC0

            // UID bytes 3-6 in page 1
            this.nfcPages[1][0] = uid[3];
            this.nfcPages[1][1] = uid[4];
            this.nfcPages[1][2] = uid[5];
            this.nfcPages[1][3] = uid[6];

            // BCC1 and internal bytes in page 2
            this.nfcPages[2][0] = uid[3] ^ uid[4] ^ uid[5] ^ uid[6]; // BCC1
            this.nfcPages[2][1] = 0x48; // Internal byte
            this.nfcPages[2][2] = 0x00;
            this.nfcPages[2][3] = 0x00;

            // Capability Container in page 3
            this.nfcPages[3] = [0xE1, 0x10, this.getCCLength(), 0x00];
        }

        getCCLength() {
            // Get the correct CC length based on the tag type
            const ccLengths = { 'NTAG213': 0x0F, 'NTAG215': 0x6D, 'NTAG216': 0xEB };
            if (this.nfcDeviceType in ccLengths) {
                return ccLengths[this.nfcDeviceType];
            } else {
                this.helper.throwException('Error: Invalid device type');
            }
        }

        NDEF_URI_URL(data, type = 'URL') {
            const uriPrefixes = {
                'http://www.': 0x01,
                'https://www.': 0x02,
                'http://': 0x03,
                'https://': 0x04,
                'tel:': 0x05,
                'mailto:': 0x06,
                'ftp://': 0x0D,
                'ftps://': 0x0E,
                'sftp://': 0x45,
                'geo:': 0x1F
            };

            let payload;
            let recordType;

            if (type === 'URL' || type === 'SocialMedia') {
                let prefix = '';
                let prefixCode = 0x00;
                for (let key in uriPrefixes) {
                    if (data.toLowerCase().startsWith(key)) {
                        prefix = key;
                        prefixCode = uriPrefixes[key];
                        break;
                    }
                }
                if (prefix) {
                    data = data.slice(prefix.length);
                }
                payload = [prefixCode, ...this.helper.string_to_bytes(data)];
                recordType = 0x55; // 'U' for URI
            } else if (type === 'Phone') {
                payload = [uriPrefixes['tel:'], ...this.helper.string_to_bytes(data)];
                recordType = 0x55; // 'U' for URI
            } else if (type === 'Text') {
                payload = [0x02, 0x65, 0x6E, ...this.helper.string_to_bytes(data)]; // 0x02 for UTF-8, 'en' for English
                recordType = 0x54; // 'T' for Text
            } else if (type === 'Email') {
                payload = [uriPrefixes['mailto:'], ...this.helper.string_to_bytes(data)];
                recordType = 0x55; // 'U' for URI
            } else if (type === 'Geo') {
                const prefixCode = uriPrefixes['geo:'];
                data = data.slice(4); // Remove 'geo:'
                payload = [prefixCode, ...this.helper.string_to_bytes(data)];
                recordType = 0x55; // 'U' for URI
            } else if (type === 'SMS') {
                const prefixCode = 0x00; // No prefix code
                payload = [prefixCode, ...this.helper.string_to_bytes(data)];
                recordType = 0x55; // 'U' for URI
            } else {
                throw new Error('Unsupported data type');
            }

            let payloadLength = payload.length;

            let ndefHeader = [];
            if (payloadLength < 256) {
                // Short Record
                ndefHeader = [
                    0xD1, // Record Header (MB=1, ME=1, CF=0, SR=1, IL=0, TNF=001)
                    0x01, // Type Length
                    payloadLength, // Payload Length
                    recordType // Type
                ];
            } else {
                // Normal Record
                ndefHeader = [
                    0xC1, // Record Header (MB=1, ME=1, CF=0, SR=0, IL=0, TNF=001)
                    0x01, // Type Length
                    ...[0x00, 0x00, 0x00, 0x00], // Placeholder for 4-byte Payload Length
                    recordType // Type
                ];
                let plBytes = [
                    (payloadLength >>> 24) & 0xFF,
                    (payloadLength >>> 16) & 0xFF,
                    (payloadLength >>> 8) & 0xFF,
                    payloadLength & 0xFF
                ];
                ndefHeader.splice(2, 4, ...plBytes);
            }

            let ndefMessage = [
                0x03, // NDEF Message TLV Tag
                payloadLength + ndefHeader.length + 1, // Length
                ...ndefHeader,
                ...payload,
                0xFE // Terminator TLV
            ];

            // Write NDEF message to pages starting from page 4
            this.writeNDEFMessage(ndefMessage);
        }

        NDEF_vCard(data) {
            const payload = this.helper.string_to_bytes(data);
            const payloadLength = payload.length;
            const typeBytes = this.helper.string_to_bytes('text/x-vCard');
            const typeLength = typeBytes.length;

            const ndefHeader = [
                0xD2, // MB=1, ME=1, CF=0, SR=1, IL=0, TNF=010 (MIME Media type)
                typeLength, // Type Length
                payloadLength, // Payload Length
                ...typeBytes
            ];

            const ndefMessage = [
                0x03, // NDEF Message TLV Tag
                payloadLength + ndefHeader.length + 1, // Length
                ...ndefHeader,
                ...payload,
                0xFE // Terminator TLV
            ];

            this.writeNDEFMessage(ndefMessage);
        }

        NDEF_WiFi(data) {
            // Parse the input data
            const params = data.split(';').reduce((acc, param) => {
                const [key, value] = param.split(':');
                acc[key] = value;
                return acc;
            }, {});

            if (!params.SSID || !params.PASSWORD || !params.AUTH) {
                throw new Error('Invalid Wi-Fi configuration data.');
            }

            // Build the Wi-Fi Credential according to Wi-Fi Alliance specification
            const ssidBytes = this.helper.string_to_bytes(params.SSID);
            const passwordBytes = this.helper.string_to_bytes(params.PASSWORD);
            const authType = params.AUTH.toUpperCase() === 'WPA' ? [0x00, 0x02] : [0x00, 0x01]; // WPA or WEP

            const credential = [
                // Credential TLV
                0x10, 0x0E, // Credential Type, Length (will be updated later)
                // SSID TLV
                0x10, 0x45, ssidBytes.length, ...ssidBytes,
                // Authentication Type TLV
                0x10, 0x03, 0x02, ...authType,
                // Network Key (Password) TLV
                0x10, 0x27, passwordBytes.length, ...passwordBytes,
                // MAC Address TLV (optional, skipping)
            ];

            // Update Credential Length
            const credentialLength = credential.length - 2; // Exclude the Type and Length fields
            credential[1] = credentialLength;

            const payload = [
                // Version TLV
                0x10, 0x0E, 0x01, 0x10, // Version 1.0
                // Number of Credentials TLV
                0x10, 0x02, 0x01, 0x01,
                // Credential
                ...credential
            ];

            const payloadLength = payload.length;

            const ndefHeader = [
                0xD1, // MB=1, ME=1, CF=0, SR=1, IL=0, TNF=001 (Well-known type)
                0x03, // Type Length
                payloadLength, // Payload Length
                0x53, 0x70, 0x70 // Type 'S' 'p' 'p' (WPS)
            ];

            const ndefMessage = [
                0x03, // NDEF Message TLV Tag
                payloadLength + ndefHeader.length + 1, // Length
                ...ndefHeader,
                ...payload,
                0xFE // Terminator TLV
            ];

            this.writeNDEFMessage(ndefMessage);
        }

        NDEF_AAR(packageName) {
            const payload = this.helper.string_to_bytes(packageName);
            const payloadLength = payload.length;
            const typeBytes = this.helper.string_to_bytes('android.com:pkg');

            const ndefHeader = [
                0xD4, // MB=1, ME=1, CF=0, SR=1, IL=0, TNF=100 (External type)
                typeBytes.length, // Type Length
                payloadLength, // Payload Length
                ...typeBytes
            ];

            const ndefMessage = [
                0x03, // NDEF Message TLV Tag
                payloadLength + ndefHeader.length + 1, // Length
                ...ndefHeader,
                ...payload,
                0xFE // Terminator TLV
            ];

            this.writeNDEFMessage(ndefMessage);
        }

        NDEF_CustomMIME(data) {
            const [mimeType, ...contentArray] = data.split('\n');
            const content = contentArray.join('\n');
            const payload = this.helper.string_to_bytes(content);
            const payloadLength = payload.length;
            const typeBytes = this.helper.string_to_bytes(mimeType);
            const typeLength = typeBytes.length;

            const ndefHeader = [
                0xD2, // MB=1, ME=1, CF=0, SR=1, IL=0, TNF=010 (MIME Media type)
                typeLength, // Type Length
                payloadLength, // Payload Length
                ...typeBytes
            ];

            const ndefMessage = [
                0x03, // NDEF Message TLV Tag
                payloadLength + ndefHeader.length + 1, // Length
                ...ndefHeader,
                ...payload,
                0xFE // Terminator TLV
            ];

            this.writeNDEFMessage(ndefMessage);
        }

        writeNDEFMessage(ndefMessage) {
            let pageIndex = 4;
            let byteIndex = 0;
            for (let i = 0; i < ndefMessage.length; i++) {
                this.nfcPages[pageIndex][byteIndex] = ndefMessage[i];
                byteIndex++;
                if (byteIndex === 4) {
                    byteIndex = 0;
                    pageIndex++;
                    if (pageIndex >= this.nfcPages.length) {
                        throw new Error('NDEF message is too large for the tag.');
                    }
                }
            }
            // Fill the rest of the last page with zeros if necessary
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

        setEndPages() {
            // Set specific end pages based on tag type
            const endPages = {
                'NTAG213': {
                    41: [0x00, 0x00, 0x00, 0xBD],
                    42: [0x04, 0x00, 0x00, 0xFF],
                    43: [0x00, 0x05, 0x00, 0x00],
                    44: [0xFF, 0xFF, 0xFF, 0xFF]
                },
                'NTAG215': {
                    130: [0x00, 0x00, 0x00, 0xBD],
                    131: [0x04, 0x00, 0x00, 0xFF],
                    132: [0x00, 0x05, 0x00, 0x00],
                    133: [0xFF, 0xFF, 0xFF, 0xFF],
                    134: [0x00, 0x00, 0x00, 0x00]
                },
                'NTAG216': {
                    225: [0x00, 0x00, 0x00, 0xBD],
                    226: [0x04, 0x00, 0x00, 0xFF],
                    227: [0x00, 0x05, 0x00, 0x00],
                    228: [0xFF, 0xFF, 0xFF, 0xFF],
                    229: [0x00, 0x00, 0x00, 0x00]
                }
            };

            const tagEndPages = endPages[this.nfcDeviceType];
            for (let page in tagEndPages) {
                const pageIndex = parseInt(page, 10); // Convert page to integer
                this.nfcPages[pageIndex] = tagEndPages[page];
            }
        }

        generate_TAG_URL(data, type = 'URL') {
            this.nfcUID = this.generateUID();
            this.generate();
            this.NDEF_URI_URL(data, type);
            this.setEndPages();
        }

        generate_TAG_vCard(data) {
            this.nfcUID = this.generateUID();
            this.generate();
            this.NDEF_vCard(data);
            this.setEndPages();
        }

        generate_TAG_WiFi(data) {
            this.nfcUID = this.generateUID();
            this.generate();
            this.NDEF_WiFi(data);
            this.setEndPages();
        }

        generate_TAG_AAR(packageName) {
            this.nfcUID = this.generateUID();
            this.generate();
            this.NDEF_AAR(packageName);
            this.setEndPages();
        }

        generate_TAG_CustomMIME(data) {
            this.nfcUID = this.generateUID();
            this.generate();
            this.NDEF_CustomMIME(data);
            this.setEndPages();
        }

        exportData() {
            const header = this.generateHeader();
            const pages = this.generatePages();
            return header + '\n' + pages + '\nFailed authentication attempts: 0\n';
        }
    }

    function generateNFCData() {
        const selectedType = tagTypeSelect.value;
        const selectedTagType = nfcTagTypeSelect.value;

        let inputData = '';

        // Collect data based on selected type
        if (selectedType === 'URL' || selectedType === 'SocialMedia') {
            inputData = inputs.urlInput.value.trim();
        } else if (selectedType === 'Text') {
            inputData = inputs.textInput.value.trim();
        } else if (selectedType === 'Phone') {
            inputData = inputs.phoneInput.value.trim();
        } else if (selectedType === 'Email') {
            inputData = inputs.emailInput.value.trim();
        } else if (selectedType === 'WiFi') {
            const ssid = inputs.ssidInput.value.trim();
            const password = inputs.passwordInput.value.trim();
            const auth = inputs.authTypeSelect.value;
            inputData = `SSID:${ssid};PASSWORD:${password};AUTH:${auth}`;
        } else if (selectedType === 'Contact') {
            inputData = inputs.contactInput.value.trim();
        } else if (selectedType === 'Geo') {
            const lat = inputs.latitudeInput.value.trim();
            const lng = inputs.longitudeInput.value.trim();
            inputData = `geo:${lat},${lng}`;
        } else if (selectedType === 'SMS') {
            const number = inputs.smsNumberInput.value.trim();
            const body = encodeURIComponent(inputs.smsBodyInput.value.trim());
            inputData = `sms:${number}?body=${body}`;
        } else if (selectedType === 'LaunchApp') {
            inputData = inputs.packageNameInput.value.trim();
        } else if (selectedType === 'CustomMIME') {
            const mimeType = inputs.mimeTypeInput.value.trim();
            const data = inputs.mimeDataInput.value.trim();
            inputData = `${mimeType}\n${data}`;
        }

        if (!inputData) {
            alert('Please enter data');
            return;
        }

        // Input validation
        if (!isValidInput(selectedType, inputData)) {
            alert('Input contains invalid characters or is improperly formatted.');
            return;
        }

        try {
            const nfcTag = new nfcNTAG(selectedTagType);
            if (selectedType === 'WiFi') {
                nfcTag.generate_TAG_WiFi(inputData);
            } else if (selectedType === 'Contact') {
                nfcTag.generate_TAG_vCard(inputData);
            } else if (selectedType === 'Geo') {
                nfcTag.generate_TAG_URL(inputData, 'Geo');
            } else if (selectedType === 'SMS') {
                nfcTag.generate_TAG_URL(inputData, 'SMS');
            } else if (selectedType === 'LaunchApp') {
                nfcTag.generate_TAG_AAR(inputData);
            } else if (selectedType === 'CustomMIME') {
                nfcTag.generate_TAG_CustomMIME(inputData);
            } else if (selectedType === 'SocialMedia') {
                nfcTag.generate_TAG_URL(inputData, 'URL');
            } else {
                nfcTag.generate_TAG_URL(inputData, selectedType);
            }

            const nfcData = nfcTag.exportData();

            nfcDataOutput.textContent = nfcData;
            outputSection.classList.remove('hidden');
        } catch (error) {
            alert(error.message);
            console.error(error);
        }
    }

    function isValidInput(type, data) {
        if (type === 'Email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(data);
        } else if (type === 'Phone') {
            const phoneRegex = /^\+?\d{7,15}$/;
            return phoneRegex.test(data);
        } else if (type === 'URL' || type === 'SocialMedia') {
            const urlRegex = /^(https?:\/\/)?([^\s$.?#].[^\s]*)$/i;
            return urlRegex.test(data);
        } else if (type === 'Text') {
            return data.length <= 1000;
        } else if (type === 'WiFi') {
            const wifiRegex = /^SSID:.+;PASSWORD:.+;AUTH:(WPA|WEP|NONE)$/;
            return wifiRegex.test(data);
        } else if (type === 'Contact') {
            return data.startsWith('BEGIN:VCARD') && data.endsWith('END:VCARD');
        } else if (type === 'Geo') {
            const geoRegex = /^geo:-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;
            return geoRegex.test(data);
        } else if (type === 'SMS') {
            const smsRegex = /^sms:\+?\d+\?body=.+$/;
            return smsRegex.test(data);
        } else if (type === 'LaunchApp') {
            const packageRegex = /^[a-zA-Z0-9\._]+$/;
            return packageRegex.test(data);
        } else if (type === 'CustomMIME') {
            const [mimeType] = data.split('\n');
            const mimeRegex = /^[\w\-]+\/[\w\-]+$/;
            return mimeRegex.test(mimeType);
        }
        return false;
    }

    function downloadNFCFile() {
        const nfcData = nfcDataOutput.textContent;
        const blob = new Blob([nfcData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        let filename = 'nfc_tag';

        // Use the selected tag type as part of the filename
        const tagType = tagTypeSelect.value;
        filename = `nfc_${tagType.toLowerCase()}`;

        a.download = `${filename}.nfc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function toggleTheme() {
        document.body.classList.toggle('dark-theme');
    }

    tagTypeSelect.addEventListener('change', showRelevantInputs);
    generateButton.addEventListener('click', generateNFCData);
    downloadButton.addEventListener('click', downloadNFCFile);
    themeToggle.addEventListener('click', toggleTheme);

    showRelevantInputs();
});