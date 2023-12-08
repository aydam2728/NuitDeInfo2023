const express = require('express');
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const {Axios} = require("axios");


const app = express();
const port = process.env.PORT || 3000;
let filename = ''; // Declare filename in the outer scope
const saveDirectory = path.join(__dirname, 'images'); // Directory to save the converted images

app.get('/convert', async (req, res) => {
    const imageUrl = req.query.url; // Get the URL of the image from the request
    console.log(imageUrl);
    const format = req.query.format; // Get the format of the image from the request
    const maxWeight = req.query.maxWeight; // Get the maxWeight of the image from the request

    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const response2 = await axios.get(imageUrl, { responseType: 'stream' });
        filename = "";
        if (response.status === 200) {
            let compressedJson = null;
            // wait for the conversion to finish
            if (format == "avif") {
                compressedJson = await AVIF(response.data,maxWeight);
            }
            else if (format == "webp") {
                compressedJson = await WEBP(response.data,maxWeight);
            }else if(format == "webm"){
                compressedJson = await WEBM(req.query.url);
            }
            else {
                res.status(500).send('Error during conversion.');
            }


            const imageBuffer = Buffer.from(response.data);
            const imageWeight = imageBuffer.length / 1000;
            const image = await sharp(imageBuffer).metadata();


            const imageUrl = `http://localhost:3000/images/${filename}`; // URL of the saved image

            const json = {
                "imageUrl": imageUrl,
                "entryData":{
                    "weight": imageWeight,
                    "width": image.width,
                    "height": image.height,
                    "format": image.format,
                },
                "compressedData": compressedJson,
            };

            res.send(json);
        } else {
            res.status(response.status).send('Unable to fetch the image from the URL.');
        }
    } catch (error) {
        console.error(`Error during conversion: ${error.message}`);
        res.status(500).send('Error during conversion.');
    }
});

app.post('/compress-video', (req, res) => {
    // Insérez ici la logique de compression vidéo en utilisant fluent-ffmpeg
    // Renvoyez une réponse appropriée
});

app.use('/images', express.static(saveDirectory)); // Serve saved images from /images route

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// image to avif
async function AVIF(imageBuffer,maxWeight) {
    var width = (await sharp(imageBuffer).metadata()).width;
    let avifBuffer = await sharp(imageBuffer)
        .avif() // Use AVIF instead of WebP
        .toBuffer();
    let avifWeight = avifBuffer.length / 1024;
    var quality = 100;


    while (quality > 10 && avifWeight > maxWeight){
        quality = quality - 10;
        console.log(quality);
        avifBuffer = await sharp(imageBuffer)
            .avif({quality: quality})
            .toBuffer();
        avifWeight = avifBuffer.length / 1024;
    }
    while ( width > 100 && avifWeight > maxWeight  ){
        width = width - 50;
        avifBuffer = await sharp(imageBuffer)
            .resize({
                fit: 'inside',
                width: width, // Largeur maximale temporaire pour conserver la qualité de l'image
            })
            .avif({quality: quality})
            .toBuffer()

        avifWeight = avifBuffer.length / 1024;
    }

    // Generate a unique filename for the saved image
    filename = `avif_${Date.now()}.avif`;
    const savePath = path.join(saveDirectory, filename);

    // AVIF resolution
    const avif = await sharp(avifBuffer).metadata();

    // Save the AVIF image to the server
    fs.writeFileSync(savePath, avifBuffer);
    return {
        "weight": avifWeight,
        "width": avif.width,
        "height": avif.height,
        "format": avif.format,
    };
}

// image to webp
 async function WEBP(imageBuffer,maxWeight) {
    var width = (await sharp(imageBuffer).metadata()).width;
    console.log(width);
    var quality = 100;
     let webpBuffer = await sharp(imageBuffer)
         .webp()
         .toBuffer();

     let webpWeight = webpBuffer.length / 1024;
    while ( quality > 2 && webpWeight > maxWeight){
            quality = quality - 2;
            console.log(quality);
             webpBuffer = await sharp(imageBuffer)
                .webp({quality: quality})
                .toBuffer();
             webpWeight = webpBuffer.length / 1024;
    }
    while ( width > 100 && webpWeight > maxWeight  ){
        width = width - 50;
        webpBuffer = await sharp(imageBuffer)
            .resize({
                fit: 'inside',
                width: width, // Largeur maximale temporaire pour conserver la qualité de l'image
            })
            .webp({quality: quality})
            .toBuffer()

        webpWeight = webpBuffer.length / 1024;
    }

     // Generate a unique filename for the saved image
     filename = `webp_${Date.now()}.webp`;
     const savePath = path.join(saveDirectory, filename);

     // webp resolution
     const webp = await sharp(webpBuffer).metadata();

     // Save the WebP image to the server
     fs.writeFileSync(savePath, webpBuffer);
     return {
         "weight": webpWeight,
         "width": webp.width,
         "height": webp.height,
         "format": webp.format,
     };
 }

 // video to webm using fluent-ffmpeg
async function WEBM(inputPath) {
    // Download video from URL
    let video = await downloadVideo(inputPath);
    const filename = `video_${Date.now()}.webm`;
    const outputPath = path.join(__dirname, 'videos', filename);
    // Fetch the MP4 video from the URL
    console.log('Video downloaded successfully:', video);
    return new Promise((resolve, reject) => {

        // Create an FFmpeg instance and prepare the conversion command
        try {
            ffmpeg()
                .input(video)
                .outputOptions('-c:v libvpx-vp9')
                .format('webm')
                .save(outputPath)
                .on('end', () => {
                    // Delete the downloaded video
                    fs.unlinkSync(video);
                    resolve({ // Resolve the promise with the result
                        "weight": fs.statSync(outputPath).size / 1024,
                        "width": 0,
                        "height": 0,
                        "format": "webm",
                    });
                })
                .on('error', (err) => {
                });
        } catch (e) {
            console.log(e);
        }
    });
}

async function downloadVideo(videoUrl) {
    const outputDirectory = path.join(__dirname, 'input');
    try {
        // Make an HTTP GET request to the video URL
        const response = await axios.get(videoUrl, { responseType: 'stream' });

        // Extract the file name from the URL
        const fileName = path.basename(videoUrl);

        // Specify the path where you want to save the video
        const outputPath = path.join(outputDirectory, fileName);

        // Create a writable stream and pipe the response data to it
        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        // Wait for the video to finish downloading
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
        return "input/"+fileName;

        console.log('Video downloaded successfully:', outputPath);
    } catch (error) {
        console.error('Video download failed:', error);
    }
}
