const { createApp, ref, computed } = Vue

createApp({
    setup() {
        const tagType = ref('URL')
        const inputData = ref('')
        const nfcData = ref('')
        const parsedData = ref(null)
        const isDarkMode = ref(false)

        const placeholder = computed(() => {
            switch (tagType.value) {
                case 'URL': return 'https://example.com'
                case 'Phone': return '+1234567890'
                case 'Text': return 'Enter your text here'
                case 'Email': return 'example@email.com'
                default: return 'Enter data'
            }
        })

        function generateTag() {
            if (!inputData.value) {
                alert('Please enter input data')
                return
            }

            const uid = Array.from({ length: 7 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(' ')
            const encodedData = encodeData(tagType.value, inputData.value)
            const pages = encodedData.match(/.{1,8}/g) || []

            nfcData.value = `Filetype: Flipper NFC device
Version: 4
Device type: NTAG/Ultralight
UID: ${uid}
ATQA: 00 44
SAK: 00
Data format version: 2
NTAG/Ultralight type: NTAG215
Signature: ${Array(32).fill('00').join(' ')}
Mifare version: 00 04 04 02 01 00 11 03
Counter 0: 0
Tearing 0: 00
Counter 1: 0
Tearing 1: 00
Counter 2: 0
Tearing 2: 00
Pages total: 135
Pages read: 135
Page 0: ${uid.split(' ').slice(0, 3).join(' ')}
Page 1: ${uid.split(' ').slice(3).join(' ')} 87
Page 2: 27 48 00 00
Page 3: E1 10 3E 00
${pages.map((page, i) => `Page ${i + 4}: ${page.match(/.{1,2}/g).join(' ').padEnd(11, '0')}`).join('\n')}
${Array.from({ length: 135 - pages.length - 4 }, (_, i) => `Page ${i + pages.length + 4}: 00 00 00 00`).join('\n')}
Failed authentication attempts: 0`

            parsedData.value = {
                dataType: tagType.value,
                decodedData: inputData.value,
                uid: uid
            }
        }

        function encodeData(type, data) {
            let prefix
            switch (type) {
                case 'URL':
                    prefix = data.startsWith('https://') ? '03' : data.startsWith('http://') ? '02' : '01'
                    data = data.replace(/^https?:\/\//, '')
                    break
                case 'Phone': prefix = '05'; break
                case 'Text': prefix = '01'; break
                case 'Email': prefix = '06'; break
                default: prefix = '00'
            }
            return prefix + data.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('') + 'FE'
        }

        function copyToClipboard() {
            navigator.clipboard.writeText(nfcData.value).then(() => {
                alert('NFC tag data copied to clipboard!')
            })
        }

        function toggleTheme() {
            isLightMode.value = !isLightMode.value
            document.body.classList.toggle('light', isLightMode.value)
        }

        return {
            tagType,
            inputData,
            nfcData,
            parsedData,
            placeholder,
            generateTag,
            copyToClipboard,
            toggleTheme
        }
    }
}).mount('#app')