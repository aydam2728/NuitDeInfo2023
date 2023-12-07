class CompWebP {
    constructor(imageData) {
        this.imageData = imageData; // imageData est un objet contenant les données de l'image
        this.isLossy = false; // true pour VP8, false pour VP8L
    }

    compress() {
        // Étape 1: Pré-traitement
        // Convertir l'image en un format approprié pour la compression (par exemple, YUV)
        // print typeof(this.imageData)
        console.log(typeof this.imageData);
        let processedData = this.preprocessImage(this.imageData);

        let compressedData;
        if (this.avecPerte(80, { width: processedData.width, height: processedData.height })) {
            compressedData = this.compressLossy(processedData);
        } else {
            compressedData = this.compressLossless(processedData);
        }

        return this.wrapInWebPFormat(compressedData);
    }

    preprocessImage(image) {
        if (!(image instanceof ImageData)) {
            throw new Error("Invalid image data");
        }
        var data = image.data;
        var width = image.width;
        var height = image.height;
        var length = width * height * 4;
        for (var i = 0; i < length; i += 4) {
            var gris = 0.3 * data[i] + 0.6 * data[i + 1] + 0.1 * data[i + 2];
            data[i] = gris;    // Rouge
            data[i + 1] = gris; // Vert
            data[i + 2] = gris; // Bleu
            // Alpha inchangé: data[i + 3]
        }
        return new ImageData(new Uint8ClampedArray(data), width, height);
    }

    avecPerte(qualite,resolution) {//Vérifie si on autorise une perte
        if (qualite<80 && (resolution.width>1920) || (resolution.height>1080)){//On fait avec perte si la qualité est de 80 et l'image a une résolution 1920x1080
            return true;
        }
        else{
            return false;
        }
    }

    compressLossy(imageData) {
        // imageData est supposé être un tableau 2D représentant les pixels de l'image
        // Dans une implémentation réelle, cette méthode appliquerait des techniques de compression avec perte basées sur VP8

        // Étape 1: Transformation (comme la transformation DCT)
        let transformedData = this.applyDCT(imageData);

        // Étape 2: Quantification
        let quantizedData = this.quantize(transformedData);

        // Étape 3: Codage (comme le codage VP8)
        let encodedData = this.encodeVP8(quantizedData);

        return encodedData;
    }

    applyDCT(imageData) {
        // Cette implémentation est une version très simplifiée et ne reflète pas une DCT complète et optimisée
        let blockSize = 8; // Taille standard d'un bloc pour DCT en JPEG
        let width = imageData[0].length;
        let height = imageData.length;
        let transformedData = [];

        for (let y = 0; y < height; y += blockSize) {
            for (let x = 0; x < width; x += blockSize) {
                // Appliquer la DCT sur chaque bloc de l'image
                let block = this.extractBlock(imageData, x, y, blockSize);
                let dctBlock = this.dctTransform(block);
                transformedData.push(dctBlock);
            }
        }

        return transformedData;
    }
    extractBlock(imageData, x, y, blockSize) {
        // Extraire un bloc de données de l'image
        let block = [];
        for (let i = y; i < y + blockSize; i++) {
            for (let j = x; j < x + blockSize; j++) {
                block.push(imageData[i][j]);
            }
        }
        return block;
    }

     dctTransform(block) {
        let N = block.length;
        let M = block[0].length;
        let transformedBlock = new Array(N);

        for (let u = 0; u < N; u++) {
            transformedBlock[u] = new Array(M).fill(0);
            for (let v = 0; v < M; v++) {
                let sum = 0;
                for (let i = 0; i < N; i++) {
                    for (let j = 0; j < M; j++) {
                        let pixel = block[i][j];
                        sum += pixel * Math.cos(((2 * i + 1) * u * Math.PI) / (2 * N)) * Math.cos(((2 * j + 1) * v * Math.PI) / (2 * M));
                    }
                }
                sum *= ((u === 0) ? 1 / Math.sqrt(N) : Math.sqrt(2) / Math.sqrt(N)) * ((v === 0) ? 1 / Math.sqrt(M) : Math.sqrt(2) / Math.sqrt(M));
                transformedBlock[u][v] = sum;
            }
        }

        return transformedBlock;
    }

     quantize(transformedData) {
        let quantizationMatrix = [
            [16, 11, 10, 16, 24, 40, 51, 61],
            [12, 12, 14, 19, 26, 58, 60, 55],
            [14, 13, 16, 24, 40, 57, 69, 56],
            [14, 17, 22, 29, 51, 87, 80, 62],
            [18, 22, 37, 56, 68, 109, 103, 77],
            [24, 35, 55, 64, 81, 104, 113, 92],
            [49, 64, 78, 87, 103, 121, 120, 101],
            [72, 92, 95, 98, 112, 100, 103, 99]
        ];

        let blockSize = 8;
        let width = transformedData[0].length;
        let height = transformedData.length;
        let quantizedData = [];

        for (let i = 0; i < height; i += blockSize) {
            for (let j = 0; j < width; j += blockSize) {
                let block = this.extractBlock(transformedData, j, i, blockSize);
                let quantizedBlock = this.quantizeBlock(block, quantizationMatrix);
                quantizedData.push(quantizedBlock);
            }
        }

        return quantizedData;
    }

    quantizeBlock(block, quantizationMatrix) {
        let blockSize = block.length;
        let quantizedBlock = new Array(blockSize);

        for (let i = 0; i < blockSize; i++) {
            quantizedBlock[i] = new Array(blockSize);
            for (let j = 0; j < blockSize; j++) {
                // Appliquer la quantification en divisant chaque coefficient par l'élément correspondant dans la matrice de quantification
                quantizedBlock[i][j] = Math.round(block[i][j] / quantizationMatrix[i][j]);
            }
        }

        return quantizedBlock;
    }

    extractBlock(transformedData, x, y, blockSize) {
        // Cette fonction extrait un bloc spécifique des données transformées
        let block = [];
        for (let i = y; i < y + blockSize; i++) {
            for (let j = x; j < x + blockSize; j++) {
                block.push(transformedData[i][j]);
            }
        }
        return block;
    }


     encodeVP8(quantizedData) {
        // Ceci est une version simplifiée et ne reflète pas un véritable codage VP8
        // Dans un vrai scénario, cette fonction appliquerait des techniques de codage avancées, y compris la prédiction de mouvement, la transformation, la quantification et le codage entropique.

        let encodedData = [];

        // Parcourir les données quantifiées et appliquer une forme simplifiée de codage
        for (let i = 0; i < quantizedData.length; i++) {
            for (let j = 0; j < quantizedData[i].length; j++) {
                // Ici, on pourrait appliquer des techniques de codage de base, comme un codage RLE simplifié (Run-Length Encoding) ou un autre codage entropique basique.
                let encodedBlock = simpleEntropyEncode(quantizedData[i][j]);
                encodedData.push(encodedBlock);
            }
        }

        return encodedData;
    }

     simpleEntropyEncode(block) {
        // Appliquer une forme très simplifiée de codage entropique.
        // Remarque : Ceci est un placeholder et ne constitue pas un véritable codage entropique efficace.
        let encodedBlock = '';
        let currentRun = 1;
        for (let i = 1; i < block.length; i++) {
            if (block[i] === block[i - 1]) {
                currentRun++;
            } else {
                encodedBlock += block[i - 1] + ':' + currentRun + ',';
                currentRun = 1;
            }
        }
        encodedBlock += block[block.length - 1] + ':' + currentRun;
        return encodedBlock;
    }



    compressLossless(imageData) {
        let processedData = this.preprocessForLosslessCompression(imageData);
        let predictedData = this.applyPixelPrediction(processedData);
        let transformedData = this.applyColorTransformation(predictedData);
        let compressedData = this.applyEntropyCoding(transformedData);

        return compressedData;
    }
    // Méthodes supplémentaires pour chaque étape de traitement
    preprocessForLosslessCompression(imageData) {
        // imageData est supposée être une instance de ImageData ou un format similaire
        if (!(imageData instanceof ImageData)) {
            throw new Error("Invalid imageData type");
        }

        // Exemple de prétraitement : conversion en niveaux de gris
        // Remarque : Ceci est un exemple simplifié. Vous pouvez choisir de ne pas modifier l'image ou d'appliquer d'autres types de prétraitements.
        let data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            // Calculer la luminance en niveaux de gris
            let grey = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];

            // Appliquer la luminance aux canaux de couleur
            data[i] = grey;     // Rouge
            data[i + 1] = grey; // Vert
            data[i + 2] = grey; // Bleu
            // Alpha reste inchangé
        }

        // Créer un nouvel objet ImageData à partir des données modifiées
        return new ImageData(new Uint8ClampedArray(data), imageData.width, imageData.height);
    }
    adjustColorPalette(imageData) {
        // imageData est supposé être une structure contenant les pixels de l'image
        // Cette fonction devrait ajuster la palette de couleurs de l'image pour une compression efficace

        // Exemple simplifié: Réduction du nombre de couleurs
        // Remarque: Cet exemple ne reflète pas l'algorithme réel de compression WebP sans perte
        for (let i = 0; i < imageData.length; i++) {
            // Réduire la quantité de chaque composante de couleur (rouge, vert, bleu)
            imageData[i].red = this.reduceColorDepth(imageData[i].red);
            imageData[i].green = this.reduceColorDepth(imageData[i].green);
            imageData[i].blue = this.reduceColorDepth(imageData[i].blue);
        }

        return imageData;
    }
    reduceColorDepth(colorValue) {
        // Réduire la profondeur de la couleur pour simplifier la palette
        // Cette fonction réduit le nombre de couleurs en diminuant la précision
        // Exemple: Réduire la précision à des paliers de 10
        return Math.floor(colorValue / 10) * 10;
    }

    applyPixelPrediction(imageData) {
        // Supposons que imageData est un objet ImageData ou un format similaire.
        // Cette méthode doit être adaptée en fonction de la structure réelle des données de votre image.
        let width = imageData.width;
        let height = imageData.height;
        let data = imageData.data;
        let predictedData = new Uint8ClampedArray(data.length);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let index = (y * width + x) * 4;

                if (x === 0 && y === 0) {
                    // Le premier pixel ne peut pas être prédit car il n'a pas de voisins précédents.
                    predictedData.set([data[index], data[index + 1], data[index + 2], data[index + 3]], index);
                } else {
                    // Prédire chaque pixel en se basant sur le pixel précédent.
                    // C'est un exemple très simplifié. Des techniques plus complexes peuvent être utilisées.
                    let leftIndex = y === 0 ? index : index - 4; // Pixel à gauche
                    let upIndex = x === 0 ? index : index - width * 4; // Pixel au-dessus

                    for (let i = 0; i < 3; i++) { // Pour les canaux RGB
                        predictedData[index + i] = data[index + i] - Math.floor((data[leftIndex + i] + data[upIndex + i]) / 2);
                    }
                    predictedData[index + 3] = data[index + 3]; // Copier la valeur alpha sans changement
                }
            }
        }

        return new ImageData(predictedData, width, height);
    }




    transformColors(imageData) {
        // imageData est supposé être un tableau 2D représentant les pixels de l'image
        // Chaque élément du tableau est un objet pixel avec des propriétés de couleur (rouge, vert, bleu)

        let width = imageData[0].length;
        let height = imageData.length;

        // Créer un nouveau tableau pour les données transformées
        let transformedData = new Array(height);

        for (let y = 0; y < height; y++) {
            transformedData[y] = new Array(width);
            for (let x = 0; x < width; x++) {
                transformedData[y][x] = this.applyColorTransformation(imageData[y][x]);
            }
        }

        return transformedData;
    }

    applyColorTransformation(pixel) {
        // Exemple de transformation: conversion RGB vers un espace colorimétrique fictif
        // Note: Ceci est une simplification. Les transformations réelles peuvent être plus complexes.
        let transformedPixel = {
            red: pixel.red - (pixel.green / 2), // Exemple de transformation
            green: pixel.green, // Garder la composante verte
            blue: pixel.blue - (pixel.green / 2) // Exemple de transformation
        };


        return transformedPixel;
    }
    applyEntropyCoding(imageData) {
        if (!imageData || !imageData.data) {
            throw new Error("Invalid imageData or imageData.data is undefined");
        }

        let data = imageData.data;
        let encodedData = [];

        for (let i = 0; i < data.length; i++) {
            let runLength = 1;
            while (i + 1 < data.length && data[i] === data[i + 1]) {
                runLength++;
                i++;
            }
            encodedData.push({value: data[i], count: runLength});
        }

        let encodedString = encodedData.map(item => `${item.value}:${item.count}`).join(',');
        return encodedString;
    }

     wrapInWebPFormat() {
        let riffHeader = this.createRIFFHeader();
        let vpHeader = this.isLossy ? this.createVP8Header() : this.createVP8LHeader();
        let metaData = this.createMetaData();

        // Calculer la taille totale
        let totalSize = riffHeader.length + vpHeader.length + this.compressedData.length + metaData.length;

        // Créer le buffer pour le fichier WebP
        let webPFile = new Uint8Array(totalSize);
        webPFile.set(riffHeader);
        webPFile.set(vpHeader, riffHeader.length);
        webPFile.set(this.compressedData, riffHeader.length + vpHeader.length);
        webPFile.set(metaData, riffHeader.length + vpHeader.length + this.compressedData.length);

        return webPFile;
    }

}
