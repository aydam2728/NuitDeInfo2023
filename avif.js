const express = require('express');
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const saveDirectory = path.join(__dirname, 'images'); // Directory to save the converted images

app.get('/convert', async (req, res) => {
    const imageUrl = req.query.url; // Get the URL of the image from the request

    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

        if (response.status === 200) {
            const imageBuffer = Buffer.from(response.data);
            const imageWeight = imageBuffer.length / 1000;
            const image = await sharp(imageBuffer).metadata();

            const avifBuffer = await sharp(imageBuffer)
                .avif() // Use AVIF instead of WebP
                .toBuffer();
            const avifWeight = avifBuffer.length / 1000;

            // Generate a unique filename for the saved image
            const filename = `avif_${Date.now()}.avif`;
            const savePath = path.join(saveDirectory, filename);

            // AVIF resolution
            const avif = await sharp(avifBuffer).metadata();

            // Save the AVIF image to the server
            fs.writeFileSync(savePath, avifBuffer);

            const imageUrl = `/images/${filename}`; // URL of the saved image
            const json = {
                "imageUrl": imageUrl,
                "imageWeight": imageWeight,
                "avifWeight": avifWeight,
                "width": image.width,
                "height": image.height,
                "width2": avif.width,
                "height2": avif.height
            };

            res.send(json);
        } else {
            res.status(response.status).send('Unable to fetch the image from the URL.');
        }
    } catch (error) {
        console.error(`Error during AVIF conversion: ${error.message}`);
        res.status(500).send('Error during AVIF conversion.');
    }
});

app.use('/images', express.static(saveDirectory)); // Serve saved images from /images route

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
