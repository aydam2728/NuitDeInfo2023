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

        // Étape 2: Compression avec Perte (VP8) ou sans Perte
        let compressedData;
        if (this.avecPerte(80,{width:processedData.width,height:processedData.height})) {
            compressedData = this.compressLossy(processedData);
        } else {
            compressedData = this.compressLossless(processedData);
        }

        // Étape 3: Post-traitement
        // Encapsuler les données compressées dans un format de fichier WebP
        return this.wrapInWebPFormat(compressedData);
    }

    preprocessImage(image) {
        if (!(image instanceof  ImageData)){
            throw new Error(('Invalid'))
        }
        var data = image.data;
        var width = image.width;
        var height = image.height;
        var lenght=image.length;
        for(var i = 0;i<lenght;i+=4){
            var gris = 0.3*data[i]+0.6*data[i+1]+0.1*data[i+2]
            data[i]=gris;
            data[i+1]=gris;
            data[i+2]=gris;
        }
        var nvData=new ImageData(new Uint8ClampedArray(data),width,height)

        return nvData;
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
        // Convertir les données de l'image en un format approprié pour la compression
        let processedData = this.preprocessForLosslessCompression(imageData);

        // Appliquer la prédiction de pixels
        let predictedData = this.applyPixelPrediction(processedData);

        // Appliquer la transformation des couleurs
        let transformedData = this.applyColorTransformation(predictedData);

        // Appliquer le codage entropique
        let compressedData = this.applyEntropyCoding(transformedData);

        return compressedData;
    }
    // Méthodes supplémentaires pour chaque étape de traitement
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

    predictPixels(imageData) {
        // imageData est supposé être un tableau 2D représentant les pixels de l'image
        // Chaque élément du tableau est un objet pixel avec des propriétés de couleur (rouge, vert, bleu)

        let width = imageData[0].length;
        let height = imageData.length;

        // Créer un nouveau tableau pour stocker les valeurs prédites
        let predictedData = new Array(height);

        for (let y = 0; y < height; y++) {
            predictedData[y] = new Array(width);
            for (let x = 0; x < width; x++) {
                // Utiliser un algorithme simple de prédiction, comme prédire chaque pixel
                // comme étant identique au pixel précédent dans la même ligne
                if (x == 0) {
                    predictedData[y][x] = imageData[y][x]; // Aucune prédiction possible pour le premier pixel de chaque ligne
                } else {
                    predictedData[y][x] = this.predictPixel(imageData, x, y);
                }
            }
        }

        return predictedData;
    }

    predictPixel(imageData, x, y) {
        // Exemple de prédiction: prédire le pixel actuel comme étant identique au pixel précédent
        // C'est une simplification. Les algorithmes réels peuvent utiliser des techniques plus complexes
        return imageData[y][x - 1];
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

    entropyEncode(imageData) {
        // Dans un scénario réel, cette méthode implémenterait un algorithme de codage entropique comme Huffman ou arithmétique.
        // L'exemple suivant est une simplification et ne représente pas une véritable compression.

        // Convertir les données d'image en une chaîne de symboles (pour l'exemple)
        let symbols = this.convertToSymbols(imageData);

        // Appliquer un codage simplifié (ceci est un placeholder et ne fait pas de réel codage entropique)
        let encodedData = this.simpleEncode(symbols);

        return encodedData;
    }

    convertToSymbols(imageData) {
        // Convertir les données d'image en une série de symboles (par exemple, en chaîne de caractères)
        // Ceci est un exemple simplifié.
        return imageData.map(row => row.map(pixel => `${pixel.red},${pixel.green},${pixel.blue}`).join(' ')).join('\n');
    }

    simpleEncode(symbols) {
        // Appliquer un "codage" simplifié (ceci est juste un exemple et ne fait pas de véritable codage entropique)
        // Par exemple, compter simplement le nombre d'occurrences de chaque symbole (ceci ne réduit pas la taille, c'est juste pour l'exemple)
        let counts = {};
        symbols.split(/\s|\n/).forEach(symbol => {
            counts[symbol] = (counts[symbol] || 0) + 1;
        });

        return JSON.stringify(counts); // Convertir le dictionnaire de comptage en chaîne de caractères pour l'exemple
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
