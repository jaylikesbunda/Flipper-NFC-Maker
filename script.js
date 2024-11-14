document.addEventListener('DOMContentLoaded', () => {
    const tagTypeSelect = document.getElementById('tagType');
    const nfcTagTypeSelect = document.getElementById('nfcTagTypeSelect');
    const generateButton = document.getElementById('generateButton');
    const outputSection = document.getElementById('outputSection');
    const nfcDataOutput = document.getElementById('nfcData');
    const downloadButton = document.getElementById('downloadButton');

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
        mimeDataInput: document.getElementById('mimeDataInput'),
        facetimeInput: document.getElementById('facetimeInput'),
        addressInput: document.getElementById('addressInput'),
        homeKitCodeInput: document.getElementById('homeKitCodeInput')
    };

    let lastInputData = ''; // Store the last input data globally
    let flipperSerial = null;

    function sanitizeFilename(name) {
        return name.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
    }

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
            return [...Array(size)]
                .map(() => Math.floor(Math.random() * 16).toString(16))
                .join('');
        }

        hexStr_to_byteArray(hex) {
            if (!hex || typeof hex !== 'string') {
                throw new Error('Invalid hex string');
            }
            return hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
        }

        byteArray_to_hexStr(buffer) {
            return [...buffer]
                .map(x => x.toString(16).padStart(2, '0'))
                .join('')
                .toUpperCase();
        }

        byteArray_to_hexStr_Split(x) {
            return x
                .map(byte => byte.toString(16).padStart(2, '0').toUpperCase())
                .join(' ');
        }

        string_to_bytes(x) {
            return x.split('').map(c => c.charCodeAt(0));
        }
    }

    class nfcNTAG {
        constructor(nfcDeviceType = 'NTAG215') {
            this.helper = new nfcHelper();
            this.nfcDeviceType = this.validDeviceType(nfcDeviceType);
            this.nfcPages = Array.from(
                { length: this.getNfcPageCount() },
                () => Array(4).fill(0)
            );
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
            const uidRest = this.helper.hexStr_to_byteArray(
                this.helper.randomHex(12)
            ); // 6 bytes
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

        NDEF_URI_URL(data) {
            const uriPrefixes = {
                'http://www.': 0x01,
                'https://www.': 0x02,
                'http://': 0x03,
                'https://': 0x04,
                'tel:': 0x05,
                'mailto:': 0x06,
                'ftp://': 0x0D,
                'ftps://': 0x0E,
                'geo:': 0x1F,
                // Custom schemes will use prefix code 0x00
            };

            let prefixCode = 0x00; // Default to no prefix

            for (let key in uriPrefixes) {
                if (data.toLowerCase().startsWith(key)) {
                    prefixCode = uriPrefixes[key];
                    data = data.slice(key.length);
                    break;
                }
            }

            let payload = [prefixCode, ...this.helper.string_to_bytes(data)];

            let payloadLength = payload.length;

            let ndefHeader = [];
            if (payloadLength < 256) {
                // Short Record
                ndefHeader = [
                    0xD1, // Record Header
                    0x01, // Type Length
                    payloadLength, // Payload Length
                    0x55 // Type
                ];
            } else {
                // Normal Record
                ndefHeader = [
                    0xC1, // Record Header
                    0x01, // Type Length
                    ...[0x00, 0x00, 0x00, 0x00], // Payload Length placeholder
                    0x55 // Type
                ];
                let plBytes = [
                    (payloadLength >>> 24) & 0xFF,
                    (payloadLength >>> 16) & 0xFF,
                    (payloadLength >>> 8) & 0xFF,
                    payloadLength & 0xFF
                ];
                ndefHeader.splice(2, 4, ...plBytes);
            }

            let totalLength = ndefHeader.length + payloadLength;

            let ndefMessage = [];

            if (totalLength < 255) {
                ndefMessage = [
                    0x03, // NDEF Message TLV Tag
                    totalLength, // Length (1 byte)
                    ...ndefHeader,
                    ...payload,
                    0xFE // Terminator TLV
                ];
            } else {
                ndefMessage = [
                    0x03, // NDEF Message TLV Tag
                    0xFF, // Length field extended indicator
                    (totalLength >> 8) & 0xFF, // Length high byte
                    totalLength & 0xFF,        // Length low byte
                    ...ndefHeader,
                    ...payload,
                    0xFE // Terminator TLV
                ];
            }

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

            let totalLength = ndefHeader.length + payloadLength;

            let ndefMessage = [];

            if (totalLength < 255) {
                ndefMessage = [
                    0x03, // NDEF Message TLV Tag
                    totalLength, // Length (1 byte)
                    ...ndefHeader,
                    ...payload,
                    0xFE // Terminator TLV
                ];
            } else {
                ndefMessage = [
                    0x03, // NDEF Message TLV Tag
                    0xFF, // Length field extended indicator
                    (totalLength >> 8) & 0xFF, // Length high byte
                    totalLength & 0xFF,        // Length low byte
                    ...ndefHeader,
                    ...payload,
                    0xFE // Terminator TLV
                ];
            }

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
            let authType;
            if (params.AUTH.toUpperCase() === 'WPA') {
                authType = [0x00, 0x02];
            } else if (params.AUTH.toUpperCase() === 'WEP') {
                authType = [0x00, 0x01];
            } else {
                authType = [0x00, 0x00]; // None
            }

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

            let totalLength = ndefHeader.length + payloadLength;

            let ndefMessage = [];

            if (totalLength < 255) {
                ndefMessage = [
                    0x03, // NDEF Message TLV Tag
                    totalLength, // Length (1 byte)
                    ...ndefHeader,
                    ...payload,
                    0xFE // Terminator TLV
                ];
            } else {
                ndefMessage = [
                    0x03, // NDEF Message TLV Tag
                    0xFF, // Length field extended indicator
                    (totalLength >> 8) & 0xFF, // Length high byte
                    totalLength & 0xFF,        // Length low byte
                    ...ndefHeader,
                    ...payload,
                    0xFE // Terminator TLV
                ];
            }

            this.writeNDEFMessage(ndefMessage);
        }

        NDEF_AAR(packageName) {
            const payload = this.helper.string_to_bytes(packageName);
            const payloadLength = payload.length;
            const typeBytes = this.helper.string_to_bytes('android.com:pkg');
            const typeLength = typeBytes.length;

            const ndefHeader = [
                0xD4, // MB=1, ME=1, CF=0, SR=1, IL=0, TNF=100 (External type)
                typeLength, // Type Length
                payloadLength, // Payload Length
                ...typeBytes
            ];

            let totalLength = ndefHeader.length + payloadLength;

            let ndefMessage = [];

            if (totalLength < 255) {
                ndefMessage = [
                    0x03, // NDEF Message TLV Tag
                    totalLength, // Length (1 byte)
                    ...ndefHeader,
                    ...payload,
                    0xFE // Terminator TLV
                ];
            } else {
                ndefMessage = [
                    0x03, // NDEF Message TLV Tag
                    0xFF, // Length field extended indicator
                    (totalLength >> 8) & 0xFF, // Length high byte
                    totalLength & 0xFF,        // Length low byte
                    ...ndefHeader,
                    ...payload,
                    0xFE // Terminator TLV
                ];
            }

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

            let totalLength = ndefHeader.length + payloadLength;

            let ndefMessage = [];

            if (totalLength < 255) {
                ndefMessage = [
                    0x03, // NDEF Message TLV Tag
                    totalLength, // Length (1 byte)
                    ...ndefHeader,
                    ...payload,
                    0xFE // Terminator TLV
                ];
            } else {
                ndefMessage = [
                    0x03, // NDEF Message TLV Tag
                    0xFF, // Length field extended indicator
                    (totalLength >> 8) & 0xFF, // Length high byte
                    totalLength & 0xFF,        // Length low byte
                    ...ndefHeader,
                    ...payload,
                    0xFE // Terminator TLV
                ];
            }

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
            return this.nfcPages
                .map(
                    (page, index) =>
                        `Page ${index}: ${page
                            .map(byte => byte.toString(16).padStart(2, '0').toUpperCase())
                            .join(' ')}`
                )
                .join('\n');
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

        generate_TAG_URL(data) {
            this.nfcUID = this.generateUID();
            this.generate();
            this.NDEF_URI_URL(data);
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
        } else if (selectedType === 'FaceTime') {
            const userId = inputs.facetimeInput.value.trim();
            inputData = `facetime://${encodeURIComponent(userId)}`;
        } else if (selectedType === 'FaceTimeAudio') {
            const userId = inputs.facetimeInput.value.trim();
            inputData = `facetime-audio://${encodeURIComponent(userId)}`;
        } else if (selectedType === 'AppleMaps') {
            const address = inputs.addressInput.value.trim();
            inputData = `http://maps.apple.com/?address=${encodeURIComponent(address)}`;
        } else if (selectedType === 'HomeKit') {
            const homeKitCode = inputs.homeKitCodeInput.value.trim();
            inputData = `X-HM://${encodeURIComponent(homeKitCode)}`;
        } else if (selectedType === 'Text') {
            inputData = inputs.textInput.value.trim();
        } else if (selectedType === 'Phone') {
            inputData = `tel:${inputs.phoneInput.value.trim()}`;
        } else if (selectedType === 'Email') {
            inputData = `mailto:${inputs.emailInput.value.trim()}`;
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
    
        lastInputData = inputData; // Store inputData globally
    
        try {
            const nfcTag = new nfcNTAG(selectedTagType);
            if (
                selectedType === 'FaceTime' ||
                selectedType === 'FaceTimeAudio' ||
                selectedType === 'AppleMaps' ||
                selectedType === 'HomeKit'
            ) {
                nfcTag.generate_TAG_URL(inputData);
            } else {
                if (selectedType === 'WiFi') {
                    nfcTag.generate_TAG_WiFi(inputData);
                } else if (selectedType === 'Contact') {
                    nfcTag.generate_TAG_vCard(inputData);
                } else if (
                    selectedType === 'Geo' ||
                    selectedType === 'SMS' ||
                    selectedType === 'SocialMedia' ||
                    selectedType === 'Phone' ||
                    selectedType === 'Email'
                ) {
                    nfcTag.generate_TAG_URL(inputData);
                } else if (selectedType === 'LaunchApp') {
                    nfcTag.generate_TAG_AAR(inputData);
                } else if (selectedType === 'CustomMIME') {
                    nfcTag.generate_TAG_CustomMIME(inputData);
                } else {
                    nfcTag.generate_TAG_URL(inputData);
                }
            }
    
            const nfcData = nfcTag.exportData();
            nfcDataOutput.textContent = nfcData;
    
            // Clear previous output section content
            outputSection.innerHTML = '';
            
            // Create heading
            const heading = document.createElement('h2');
            heading.textContent = 'Generated NFC Tag Data';
            outputSection.appendChild(heading);
    
            // Create data output area
            const dataOutput = document.createElement('pre');
            dataOutput.id = 'nfcData';
            dataOutput.textContent = nfcData;
            outputSection.appendChild(dataOutput);
    
            // Create button group
            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'button-group';
    
            // Create download button
            const downloadButton = document.createElement('button');
            downloadButton.className = 'btn';
            downloadButton.textContent = 'Download .nfc File';
            downloadButton.onclick = downloadNFCFile;
            buttonGroup.appendChild(downloadButton);
    
            // Create send to Flipper button
            const sendButton = document.createElement('button');
            sendButton.className = 'btn';
            sendButton.id = 'sendToFlipperButton';
            sendButton.textContent = 'Send to Flipper';
            sendButton.onclick = sendToFlipper;
            buttonGroup.appendChild(sendButton);
    
            outputSection.appendChild(buttonGroup);
            outputSection.classList.remove('hidden');
    
        } catch (error) {
            alert(error.message);
            console.error(error);
        }
    }
    function generateFilename() {
        const tagType = document.getElementById('tagType').value;
        const sanitizedInputData = sanitizeFilename(lastInputData);
        let filename = `nfc_${tagType.toLowerCase()}_${sanitizedInputData}`;
        if (filename.length > 50) {
            filename = filename.substring(0, 50);
        }
        return filename;
    }
    async function sendToFlipper() {
        const nfcData = document.getElementById('nfcData').textContent;
        const filename = generateFilename(); // Reuse existing filename generation logic
        const sendButton = document.querySelector('#sendToFlipperButton');
        const statusDiv = document.createElement('div');
        statusDiv.className = 'send-status';
        sendButton.parentNode.appendChild(statusDiv);

        try {
            sendButton.disabled = true;
            sendButton.classList.add('sending');

            // Initialize FlipperSerial if not already done
            if (!flipperSerial) {
                flipperSerial = new FlipperSerial();
            }

            // Connect to Flipper if not connected
            if (!flipperSerial.isConnected) {
                statusDiv.textContent = 'Connecting to Flipper...';
                await flipperSerial.connect();
            }

            // Create directory and write file
            statusDiv.textContent = 'Creating directory...';
            await flipperSerial.writeCommand('storage mkdir /ext/nfc');

            statusDiv.textContent = 'Sending to Flipper...';
            await flipperSerial.writeFile(`/ext/nfc/${filename}.nfc`, nfcData);

            // Success
            statusDiv.textContent = 'Successfully sent to Flipper!';
            statusDiv.classList.add('success');

            // Reset after 3 seconds
            setTimeout(() => {
                statusDiv.remove();
                sendButton.classList.remove('sending');
                sendButton.disabled = false;
            }, 3000);

        } catch (error) {
            console.error('Error sending to Flipper:', error);
            statusDiv.textContent = `Error: ${error.message}. Please try again.`;
            statusDiv.classList.add('error');
            flipperSerial = null; // Reset FlipperSerial instance on error
            sendButton.classList.remove('sending');
            sendButton.disabled = false;
        }
    }
    function isValidInput(type, data) {
        if (type === 'Email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(data.replace(/^mailto:/, ''));
        } else if (type === 'Phone') {
            const phoneRegex = /^\+?\d{7,15}$/;
            return phoneRegex.test(data.replace(/^tel:/, ''));
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
        } else if (type === 'FaceTime' || type === 'FaceTimeAudio') {
            // Remove scheme and validate email or phone
            const input = decodeURIComponent(data.replace(/(facetime:\/\/|facetime-audio:\/\/)/i, ''));
            const emailOrPhoneRegex = /^([^\s@]+@[^\s@]+\.[^\s@]+|\+?\d{7,15})$/;
            return emailOrPhoneRegex.test(input);
        } else if (type === 'AppleMaps') {
            // Ensure that the address is provided
            return data.trim().length > 0;
        } else if (type === 'HomeKit') {
            // Validate HomeKit code (alphanumeric, length between 1 and 64)
            const homeKitRegex = /^[A-Za-z0-9]{1,64}$/;
            return homeKitRegex.test(data.replace(/^X-HM:\/\//, ''));
        }
        return false;
    }

    function downloadNFCFile() {
        const nfcData = nfcDataOutput.textContent;
        const blob = new Blob([nfcData], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        let filename = 'nfc_tag';
        const selectedType = tagTypeSelect.value;

        if (lastInputData) {
            const sanitizedInputData = sanitizeFilename(lastInputData);
            filename = `nfc_${selectedType.toLowerCase()}_${sanitizedInputData}`;
            if (filename.length > 50) {
                filename = filename.substring(0, 50);
            }
        } else {
            filename = `nfc_${selectedType.toLowerCase()}`;
        }

        a.download = `${filename}.nfc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    tagTypeSelect.addEventListener('change', showRelevantInputs);
    generateButton.addEventListener('click', generateNFCData);
    downloadButton.addEventListener('click', downloadNFCFile);

    showRelevantInputs();
});

// Theme toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    // Check for saved theme preference or default to dark theme
    const currentTheme = localStorage.getItem('theme') || 'dark';
    if (currentTheme === 'light') {
        body.classList.remove('dark-theme');
        themeToggle.textContent = 'Dark Mode';
    } else {
        body.classList.add('dark-theme');
        themeToggle.textContent = 'Light Mode';
    }

    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-theme');
        const theme = body.classList.contains('dark-theme') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        themeToggle.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    });
});
