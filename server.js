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

            const webpBuffer = await sharp(imageBuffer)
                .webp()
                .toBuffer();
            const webpWeight = webpBuffer.length / 1000;

            // Generate a unique filename for the saved image
            const filename = `webp_${Date.now()}.webp`;
            const savePath = path.join(saveDirectory, filename);

            // webp resolution
            const webp = await sharp(webpBuffer).metadata();


            // Save the WebP image to the server
            fs.writeFileSync(savePath, webpBuffer);

            const imageUrl = `/images/${filename}`; // URL of the saved image
            const json = {
                "imageUrl": imageUrl,
                "imageWeight": imageWeight,
                "webpWeight": webpWeight,
                "width": image.width,
                "height": image.height,
                "width2": webp.width,
                "height2": webp.height
            };

            res.send(json);
        } else {
            res.status(response.status).send('Unable to fetch the image from the URL.');
        }
    } catch (error) {
        console.error(`Error during WebP conversion: ${error.message}`);
        res.status(500).send('Error during WebP conversion.');
    }
});

app.use('/images', express.static(saveDirectory)); // Serve saved images from /images route

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
