function toBase64Image(image) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(image);
    });
}

function generateRandomKey(length = 16) {
    return new Promise((resolve) => {
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        resolve(Array.from(array).map(byte => byte.toString(16).padStart(2, '0')).join(''));
    });
}

async function embedMessage() {
    const imageInput = document.getElementById('imageInput').files[0];
    const message = document.getElementById('messageInput').value;
    
    if (!imageInput || !message) {
        alert('Please provide an image and a message.');
        return;
    }

    // Generate a random key and hash the message
    const key = await generateRandomKey();
    const hashedMessage = CryptoJS.AES.encrypt(message, key).toString();

    // Combine key and hashed message for embedding
    const combined = `${key}:${hashedMessage}`;

    // Embed the combined data in the image
    const base64Image = await toBase64Image(imageInput);
    const img = new Image();
    img.onload = () => {
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = new Uint8Array(imageData.data.buffer);

        const messageBin = textToBinary(combined);
        const messageLength = messageBin.length;
        const imgLength = data.length / 8;

        if (messageLength > imgLength) {
            alert('Message too long for the image.');
            return;
        }

        for (let i = 0; i < messageLength; i++) {
            const bit = messageBin[i];
            const index = i * 4; // 4 bytes per pixel (RGBA)
            data[index] = (data[index] & 0xFE) | parseInt(bit); // LSB encoding
        }

        ctx.putImageData(new ImageData(new Uint8ClampedArray(data.buffer), canvas.width, canvas.height), 0, 0);

        const newImage = canvas.toDataURL();
        downloadImage(newImage, 'encoded_image.png');
    };
    img.src = base64Image;
}

async function extractMessage() {
    const imageInput = document.getElementById('imageUpload').files[0];
    
    if (!imageInput) {
        alert('Please provide an image.');
        return;
    }

    const base64Image = await toBase64Image(imageInput);
    const img = new Image();
    img.onload = () => {
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = new Uint8Array(imageData.data.buffer);

        let messageBin = '';
        for (let i = 0; i < data.length; i += 4) {
            const lsb = data[i] & 0x01; // Extract LSB
            messageBin += lsb;
        }

        const combined = binaryToText(messageBin);
        const [key, encryptedMessage] = combined.split(':');
        
        // Decrypt the message using the extracted key
        const bytes = CryptoJS.AES.decrypt(encryptedMessage, key);
        const decryptedMessage = bytes.toString(CryptoJS.enc.Utf8);

        document.getElementById('extractedMessage').innerText = decryptedMessage;
    };
    img.src = base64Image;
}

function textToBinary(text) {
    return Array.from(text).map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join('');
}

function binaryToText(binary) {
    return binary.match(/.{1,8}/g).map(byte => String.fromCharCode(parseInt(byte, 2))).join('');
}

function downloadImage(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
}
