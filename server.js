// server.js
// where your node app starts

// we've started you off with Express (https://expressjs.com/)
// but feel free to use whatever libraries or frameworks you'd like through `package.json`.
require('dotenv').config();
const express = require("express");
//const bodyParser = require('body-parser');
const mongoClient = require('mongodb').MongoClient;
const objectId = require('mongodb').ObjectId;
const fetch = require('node-fetch');
const fileupload = require('express-fileupload');
const fs = require('fs');
const morgan = require('morgan');
const os = require('os');
const path = require('path');
const { URLSearchParams } = require('url');

const app = express();

const mongo_conn_str = `mongodb+srv://${process.env.mongodb_user}:${process.env.mongodb_pass}@cluster0.xu9wm.mongodb.net/test?retryWrites=true&w=majority`;
const mongo_opts = {
  useUnifiedTopology: true // Remove "DeprecationWarning: current Server Discovery and Monitoring..."
};

const tmpdir = path.join(os.tmpdir(), 'smarty');
let fatSecret = {};
// mongoClient.connect(mongo_conn_str, mongo_opts, (err, client) => {
//  if (err) return console.error(err)
//  console.log('Connected to Database!')
//});

const tmpdirCreated = fs.mkdirSync(tmpdir, { recursive: true });
if (!tmpdirCreated) {
  const tmpdirExists = fs.statSync(tmpdir);
  if (!tmpdirExists) {
    console.log('Error while creating tmpdir -> ', tmpdirExists);
  }
  console.log('tmpdir already exists -> created on:', tmpdirExists.birthtime);
} else {
  console.log('tmpdir created!!! -> mkdir: ', tmpdirCreated);
}

// // Using promises in mongoClient
// mongoClient.connect(mongo_conn_str, mongo_opts)
//   .then(client => {
//     console.log('Connected to MongoDB Atlas DB!!!')
//     const db = client.db('test1');
//     const collection = db.collection('collection1');

    // make all the files in 'public' available
    // https://expressjs.com/en/starter/static-files.html

    app.use(express.static('public'));
    app.use(express.static(tmpdir));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.raw());
    app.use(fileupload({
      limits: {
        fileSize: 25 * 1024 * 1024
      },
      useTempFiles: true,
      tempFileDir: tmpdir
    }));
    app.use(morgan('common'));



    // https://expressjs.com/en/starter/basic-routing.html
    app.get("/", (request, response) => {
      response.sendFile(__dirname + "/views/index.html");
    });



    app.get('/env', (req, res) => {
      res.json(fatSecret);
    });



    app.get('/products', (request, response) => {
      collection.find().toArray()
      .then(result => {
        response.status(200).send(result);
      })
      .catch(error => {
        response.status(500).send(error);
      });
    });

    app.post('/products', (request, response) => {
      const reqBody = request.body;
      if (!reqBody || !reqBody.name || !reqBody.price) {
        response.status(400).json({error:'name or price cannot be empty'});
        return;
      }
      collection.insertOne(reqBody)
        .then(result => {
          response.status(201).send(result);
        })
        .catch(error => {
          response.status(500).send(error)
        });
    });

    app.put('/products', (request, response) => {
      const reqBody = request.body;
      if (!reqBody || !reqBody.id || !reqBody.name || !reqBody.price) {
        response.status(400).json({error:'name or price cannot be empty'});
        return;
      }
      const query = {_id: objectId(reqBody.id)};
      const newDocument = {
        name: reqBody.name,
        price: reqBody.price
      };
      const updateMode = {
        $unset: {
          product_name: "",
          product_price: ""
        },
        $set: {
          name: reqBody.name,
          price: reqBody.price
        }
      };
      const options = {
        upsert: false
      };

      collection.findOneAndUpdate(query, updateMode, options)
        .then(result => {
          response.status(201).send(result);
        })
        .catch(error => {
          response.status(500).send(error)
        });

      //collection.findOneAndReplace(query, newDocument, options)
      //  .then(result => {
      //    response.status(201).send(result);
      //  })
      //  .catch(error => {
      //    response.status(500).send(error)
      //  });
    });



    app.get('/img', (req, res) => {
      let imgsHtml = '<div class="flex-container">';

      const imgsDir = fs.opendirSync(tmpdir);
      let dirEntity;
      let imgNames = [];

      while((dirEntity = imgsDir.readSync()) !== null) {
        if (dirEntity.isFile()) {
          imgsHtml+='<div class="img-container" onclick=deleteImage("' + dirEntity.name + '")><div class="delete-overlay">Click to delete</div><img src="' + dirEntity.name + '"></div>';
          imgNames.push(dirEntity.name);
        }
      }

      imgsDir.closeSync();

      imgsHtml += '</div>';

      const html = `
      <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Images</title>
            <link rel="stylesheet" href="/style.css">
            <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
            <script src="/script.js" defer></script>
          </head>
          <body>
            ${imgsHtml}
          </body>
        </html>`;
      // res.send(html);
      res.status(200).json({ imgs: imgNames });
    });

    app.post('/img', (req, res) => {
//      console.log(req);
      // if (!req.body) {
      //   return res.status(400).json({ error: 'No payload received!!!'})
      // }

      if (!req.files) {
        return res.status(400).json({ error: 'No image received!!!'});
      }

      const firstFileKey = Object.keys(req.files)[0];
      const firstFile = Object.prototype.toString.call(req.files[firstFileKey]) === '[object Array]' ? req.files[firstFileKey][0] : req.files[firstFileKey];
      const imgFilePath = firstFile.tempFilePath;

      const options = {
        encoding: 'base64'
      };

      fs.readFile(imgFilePath, options, (err, data) => {
        if (err) {
          throw err;
        }
//        console.log(data);
        res.status(200).json({ message: `File successfully uploaded!!! -> ${firstFile.name}@${imgFilePath}`});
      });
    });

    app.delete('/img/:imgName', (req, res) => {
      if (!req.params || !req.params.imgName) {
        return res.sendStatus(400);
      }

      const imgFile = path.join(tmpdir, req.params.imgName);

      // // Using Node.js File System Synchronous API
      // // No need to check if file exists (fs.stat or fs.access) before operating on it
      // const imgFileStat = fs.statSync(imgFile);
      // // console.log(imgFileStat);
      // if (!imgFileStat) {
      //   return res.sendStatus(404);
      // }

      // const imgFileDeleted = fs.rmSync(imgFile);
      // if (imgFileDeleted !== undefined) {
      //   return res.sendStatus(500);
      // }
      // return res.sendStatus(200);

      // // Using Node.js File System Callback/Asynchronous API
      // fs.stat(imgFile, (err, stats) => {
      //   if (err) {
      //     console.log(err);
      //     return res.status(500).json(err);
      //   }

      //   if (!stats.isFile()) {
      //     return res.status(400).json({ error: 'Cannot delete resource' });
      //   }

      //   fs.rm(imgFile, { force: true }, err => {
      //     if (err) {
      //       console.log(err);
      //       return res.status(500).json(err);
      //     }
      //     return res.sendStatus(200);
      //   });
      // });

      // Using Node.js File System Promises
      // According to Node.js documentation, it is not recommended to use fs.stat or fs.access
      // before fs.open(), fs.readFile() or fs.writeFile(), as it introduces a race condition
      // Note: rm & rmSync are only available in Node.js > 14
      fs.promises.rm(imgFile, { force: true })
      .then(result => {
        // https://nodejs.org/api/fs.html#fs_fspromises_rm_path_options
        // Fulfils with undefined upon success
        if (result === undefined) {
          return res.sendStatus(200);
        }
        return res.status(500).json(JSON.stringify(res));
      })
      .catch(error => {
        return res.status(500).json(JSON.stringify(error));
      });
    });



    app.get('/food', (req, res) => {
      // console.log(req);
      // console.log(req.params, req.query);
      res.send(
        {
          "item": "banana",
          "nutritional_info": {"calories":"123"}
        });
    });

    app.post('/food', (request, response) => {
//      console.dir(request);
      if (!request.body) {
        return response.status(400).json({ error: 'No payload received!!!'})
      }

      if (!request.body.weight ) {
        return response.status(400).json({ error: 'Payload MUST contain a \'weight\' property!!!'});
      }

      if (!request.files) {
        return response.status(400).json({ error: 'No image received!!!'});
      }

      const firstFileKey = Object.keys(request.files)[0];
      const firstFile = Object.prototype.toString.call(request.files[firstFileKey]) === '[object Array]' ?
        request.files[firstFileKey][0] : request.files[firstFileKey];
      const imgFilePath = firstFile.tempFilePath;

      // let img_b64;
      // try {
      //   img_b64 = fs.readFileSync(imgFilePath, { encoding: 'base64' });
      // } catch (err) {
      //   return response.status(500).json({ error: 'Could not read image: ' + err });
      // }

      let allImgLabels;
      let filteredImgLabels;
      let searchTerm;
      let allFoods;
      let food;

      analyzeImageWithGoogle(imgFilePath)
      .then(resImg => {
        if (!resImg || !resImg.responses) {
          throw ({
            error: 'Could not detect image',
            status: 500,
            labelsFound: resImg
          });
        } else if (resImg.responses[0].error) {
          throw ({
            error: resImg.responses[0].error,
            status: 500,
            labelsFound: resImg
          });
        }

        allImgLabels = resImg.responses[0].labelAnnotations;
        filteredImgLabels = allImgLabels.filter(label => {
          const regex = new RegExp(".*(food|fruit|plant)(s)*.*", "gi");
          return !regex.test(label.description);
        });
//        console.dir(allImgLabels, filteredImgLables.length, filteredImgLabels);
        if (!filteredImgLabels.length) {
          throw ({
            error: 'Could not detect food from image',
            status: 404,
            labelsFound: allImgLabels
          });
        }

        const selectedImgLabel = filteredImgLabels[0];
        searchTerm = selectedImgLabel.description;

        return searchFoods(searchTerm);
      })
      .then(resFoods => {
//        console.dir(resFoods);
        if (resFoods.error) {
          throw ({
            error: resFoods.error,
            status: 500
          });
        }

        if (!resFoods || resFoods.total_results == 0) {
          throw ({
            error: 'Could not find any info about the food',
            status: 404,
            labelsFound: allImgLabels,
            infoFound: resFoods
          });
        }

        if (!resFoods || !resFoods.foods || !resFoods.foods.food) {
          throw ({
            error: 'Could not find any info about the food',
            status: 404,
            labelsFound: allImgLabels,
            infoFound: resFoods
          });
        }
//        console.dir(resFoods.foods.food);
        allFoods = resFoods.foods.food;
        food = resFoods.foods.food.filter(food => food.food_type==='Generic')[0];

        if (!food) {
          throw ({
            error: 'Could not find any info about the food',
            status: 404,
            labelsFound: allImgLabels,
            infoFound: resFoods
          });
        }

        return searchFoodDetails(food.food_id);
      })
      .then(resFoodDetails => {
        const servingDetails = resFoodDetails.food.servings.serving
        .filter(serving => serving.serving_description === '100 g' && serving.measurement_description === 'g');

        // return response.status(200).send({
        //   "message": 'weight was ' + request.body.weight,
        //   "searchTerm": searchTerm,
        //   "food_info": {
        //     "name": resFoodDetails.food.food_name,
        //     "summary": food.food_description,
        //     "details": servingDetails
        //   },
        //   "allImgLabels": allImgLabels,
        //   "allFoods": allFoods
        // });
        return response.status(200).send({
          "message": 'weight was ' + request.body.weight,
          "food_info": {
            "name": resFoodDetails.food.food_name,
            "summary": food.food_description,
            "details": servingDetails
          }
        });
      })
      .catch(err => {
        console.error('Error -> POST /food -> analyzeImageWithGoogle().then.then.then.catch', err);
        return response.status(err.status || 500).json(err);
      });

    });

//     app.post('/food', (request, response) => {
// //      console.log(req);
// //      console.log(req.body, req.params, req.query);

//       // let reqType = '';
//       // if (request.body.weight) {
//       //   reqType = 'body';
//       // } else if (request.params.weight) {
//       //   reqType = 'params'
//       // } else if (request.query.weight) {
//       //   reqType = 'query';
//       // }

//       // if (!reqType) {
//       //   response.status(200).json({ message: 'No payload received!!!'});
//       //   return;
//       // }

//       // let message = 'weight was ' + request[reqType].weight;

// // //      console.log('1. Searching for food in FatSecret API...');
// //       searchFoods('banana')
// //       .then(res => {
// // //        console.log('6. Response -> POST /food -> searchFoods().then', res);
// //         if (res.error) {
// //           response.status(200).send(res);
// //           return;
// //         }

// //         const genericFoods = res.foods.food.filter(food => food.food_type==='Generic');
// // //        console.dir(genericFoods);

// //         const genericFood = genericFoods[0];
// //         let servingDetails;

// //         searchFoodDetails(genericFood.food_id).
// //         then(res => {
// // //          console.log(res);
// //           servingDetails = res.food.servings.serving
// //           .filter(serving => serving.serving_description === '100 g' && serving.measurement_description === 'g');
// //           console.log(servingDetails);

// //           response.status(200).send({
// //             "message": message,
// //             "food_info": {
// //               "summary": genericFood.food_description,
// //               "details": servingDetails
// //             }
// //           });
// //         })
// //         .catch(err => console.error('Error -> POST /food -> searchFoodDetails().catch', err));
// //       })
// //       .catch(err => console.error('Error -> POST /food -> searchFoods().catch', err));

//       if (!request.body) {
//         return response.status(200).json({ error: 'No payload received!!!'})
//       }

//       if (!request.body.weight || !request.body.img_b64) {
//         return response.status(200).json({ error: 'Payload MUST have weight and img_b64!!!'});
//       }

//       let imgLabels;
//       let food;

//       analyzeImageWithGoogle(request.body.img_b64)
//       .then(resImg => {
//         if (!resImg || !resImg.responses) {
//           return response.status(400).json({ error: 'Could not detect image'});
//         } else if (resImg.responses[0].error) {
//           return response.status(400).json(resImg.responses[0].error);
//         }

//         imgLabels = resImg.responses[0].labelAnnotations.filter(label => label.description !== "Food");
//         return searchFoods(imgLabels[0].description);
//       })
//       .then(resFoods => {
//         if (!resFoods || !resFoods.foods || !resFoods.foods.food || resFoods.total_results == 0) {
//           return response.status(404).send({ error: 'Could not find any info about the food'});
//         }

//         food = resFoods.foods.food.filter(food => food.food_type==='Generic')[0];
//         return searchFoodDetails(food.food_id);
//       })
//       .then(resFoodDetails => {
//         if (!resFoodDetails || !resFoodDetails.food || !resFoodDetails.food.servings || !resFoodDetails.food.servings.serving) {
//           return response.status(404).send({ error: 'Could not find any detailed info about the food'});
//         }

//         const servingDetails = resFoodDetails.food.servings.serving
//         .filter(serving => serving.serving_description === '100 g' && serving.measurement_description === 'g');

//         return response.status(200).send({
//           "message": 'weight was ' + request.body.weight,
//           "imgLabels": imgLabels,
//           "food_info": {
//             "name": resFoodDetails.food.food_name,
//             "summary": food.food_description,
//             "details": servingDetails
//           }
//         });
//       })
//       .catch(err => {
//         console.error('Error -> POST /food -> analyzeImageWithGoogle().then.then.then.catch', err);
//         response.status(400).send(err);
//       });

//     });



    app.post('/compare', (request, response) => {
      // console.log(request);
      if (!request.body) {
        return response.status(400).json({ error: 'No payload received!!!'})
      }

      if (!request.files) {
        return response.status(400).json({ error: 'No image received!!!'});
      }

      const imgFilePath = request.files[Object.keys(request.files)[0]].tempFilePath;
      const azureRequest = analyzeImageWithAzure(imgFilePath, 'tag');
      const googleRequest = analyzeImageWithGoogle(imgFilePath)

      Promise.all([azureRequest, googleRequest])
      .then((values) => {
        // console.log(values);

        if (values[0].tags || (values[1].responses && values[1].responses[0].labelAnnotations)) {
          return response.json({
            azure: values[0].tags,
            google: values[1].responses[0].labelAnnotations
          });
        }
        return response.status(200).json(values);
      })
      .catch(error => {
        console.error('Error -> POST /compare -> Promise.all.catch', error);
        return response.status(error.status || 500).json(error);
      });

      // analyzeImageWithAzure(imgFile.tempFilePath, 'tag')
      // .then(result => {
      //   return response.send(result);
      // })
      // .catch(error => {
      //   console.error('Error -> POST /compare -> analyzeImageWithAzure().catch', error);
      //   return response.status(error.status || 500).json(error);
      // });
    });



    app.get('*', (req, res) => {
      res.sendStatus(200);
    });

    // listen for requests :)
    const listener = app.listen(process.env.PORT, () => {
      // const currDate = new Date();
      console.log(`[${new Date().toISOString()}] ` + "Your app is listening on port " + listener.address().port);
    });
  // })
  // .catch(err => {
  //   console.error(err);
  // });

/*
 *
 */
function expiredFatSecretAccessToken() {
  if (!fatSecret || !fatSecret.access_token) {
    return true;
  }

  const created_tms = fatSecret.access_token.created_tms;
  const expired_tms = new Date(Date.now() - fatSecret.access_token.expires_in*1000 )

  return expired_tms > created_tms;
}

/**
 * Get an Access Token from FatSecret
 **/
async function getFatSecretAccessToken() {
//  let url = `https://httpbin.org/basic-auth/${username}/${password}`
  let url = process.env.fatsecret_access_token_url;
//  let url = 'https://pokeapi.co/api/v2/pokemon/1';
//  let url = 'https://httpbin.org/post';
  let authString = `${process.env.fatsecret_user}:${process.env.fatsecret_pass}`
//  let headers = new Headers();
//  headers.set('Authorization', 'Basic ' + btoa(authString))

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('scope', 'basic');

  let options = {
    method: 'post',
    body:    params,
//    headers: headers
    headers: { 'Authorization': 'Basic ' + Buffer.from(authString).toString('base64') }
  };

  console.log('Requesting a new FatSecret Access Token...');
  const response = await fetch(url, options);
  const data = await response.json();
  fatSecret.access_token = {
    value : data.access_token,
    created_tms: new Date(),
    expires_in: data.expires_in
  };

//  return fetch(url, options)
//  .then(res => {
////    console.log('3. Response -> getFatSecretAccessToken() -> fetch().then');
//    return res.json();
//  })
//  .catch(err => console.error('Error -> getFatSecretAccessToken() -> fetch().catch', err));

//  fetch(url, options)
//  .then((res) => {
//    console.log (res);
//    console.log(res.json());
//    return res;
//  })
//  .catch(err => {
//    console.error(err);
//  });
}

/**
 * Get food search results from FatSecret
 */
async function searchFoods(searchStr) {
  if (expiredFatSecretAccessToken()) {
////    console.log('2. Requesting a new FatSecret Access Token...');
//    await getFatSecretAccessToken()
//    .then(data => {
////      console.log('4. Response -> searchFoods() -> await getFatSecretAccessToken().then');
//      fatSecret.access_token = {
//        value : data.access_token,
//        created_tms: new Date(),
//        expires_in: data.expires_in
//      };
//    })
//    .catch(err => console.error('Error -> searchFoods() -> await getFatSecretAccessToken().catch', err));
    await getFatSecretAccessToken();
  }

  let url = process.env.fatsecret_api_url;

  const params = new URLSearchParams();
  params.append('method', 'foods.search');
  params.append('search_expression', searchStr);
  params.append('format', 'json');
  params.append('page_number', 0);
  params.append('max_results', 5);

  let options = {
    method: 'post',
    body:    params,
    headers: { 'Authorization': 'Bearer ' + fatSecret.access_token.value }
  };

  console.log(`Requesting search results for "${searchStr}" from FatSecret API...`);
  return fetch(url, options)
  .then(res => {
//    console.log('5. Response -> searchFoods() -> fetch().then');
    if (!res.ok || res.error) { // same as res.status >= 200 && res.status < 300 according to: https://www.npmjs.com/package/node-fetch#handling-client-and-server-errors
      console.log('Error -> searchFoods() -> fetch().then', res);
      throw {
        "error": res.error || '',
        status: res.status,
        statusText: res.statusText
      };
    }
    return res.json();
  })
  .catch(err => {
    console.error('Error -> searchFoods() -> fetch().catch', err);
    throw err;
  });
}

/**
 *
 */
async function searchFoodDetails(foodId) {
  if (expiredFatSecretAccessToken()) {
    await getFatSecretAccessToken();
  }

  const params = new URLSearchParams();
  params.append('method', 'food.get.v2');
  params.append('food_id', foodId);
  params.append('format', 'json');

  let options = {
    method: 'post',
    body:    params,
    headers: { 'Authorization': 'Bearer ' + fatSecret.access_token.value }
  };

  console.log('Requesting FOOD DETAILS from FatSecret API...');
  return fetch(process.env.fatsecret_api_url, options)
  .then(res => {
//    console.log('Response -> searchFoodDetails() -> fetch().then');
    if (!res.ok || res.error) {
      console.log('Error -> searchFoodDetails() -> fetch().then', res);
      throw {
        "error": res.error || '',
        status: res.status,
        statusText: res.statusText
      };
    }
    return res.json();
  })
  .catch(err => {
    console.error('Error -> searchFoodDetails() -> fetch().catch', err);
    throw err;
  });
}

/**
 * Use Google Vision API to get image labels (identify what is in the image)
 *
 * @param {*} imgFilePath path to the image file to send along with the request
 * @returns all the labels identified by Google's Vision API
 */
async function analyzeImageWithGoogle(imgFilePath) {
  const url = process.env.google_vision_api_url + process.env.google_vision_api_key;

  const payload = {
    "requests": [
      {
        "image": {
          "content": fs.readFileSync(imgFilePath, { encoding: 'base64' })
        },
        "features": [
          {
            "type": "LABEL_DETECTION",
            "maxResults": 25
          }
        ]
      }
    ]
  };

  const options = {
    method: 'POST',
    body: JSON.stringify(payload) // JSON.stringify is a MUST, otherwise, Google Vision API returns 400 Bad Request
  };

  console.log('Requesting image analysis from Google\'s Vision API...');
  return fetch(url, options)
  .then(res => {
//    console.log('Response -> analyzeImageWithGoogle() -> fetch().then', res)
    if (!res.ok || res.error) {
      console.log('Error -> analyzeImageWithGoogle() -> fetch().then', res);
      throw {
        "error": res.error || '',
        status: res.status,
        statusText: res.statusText
      };
    }
    return res.json();
  })
  .catch(err => {
    console.error('Error ->analyzeImageWithGoogle() -> fetch().catch', err);
    throw err;
  });
}

/**
 * Make a request to Google Vision API to get image labels
 * Uses @google-cloud/vision Node.js library
 * @param base64Img image's Base64 encoded value
 */
async function analyzeImageWithGoogleUsingLibrary(base64Img) {
  // Imports the Google Cloud client library
  const vision = require('@google-cloud/vision');

  // Creates a client
  const client = new vision.ImageAnnotatorClient();

  // Performs label detection on the image file
  const [result] = await client.labelDetection(base64Img);
  const labels = result.labelAnnotations;
  console.log('Labels:');
  labels.forEach(label => console.log(label.description));
}

/**
 * Use Azure Computer Vision API to get image tags / labels (identify what is in the image)
 *
 * @param {*} imgFilePath path to the image file to send along with the request
 * @returns all the tags identified by Azure's Computer Vision API
 */
async function analyzeImageWithAzure (imgFilePath, endpoint) {
  const endpoints = {
    analyze: {
      url: '/analyze',
      params: '?visualFeatures=Adult,Brands,Categories,Color,Description,Faces,ImageType,Objects,Tags&details=Celebrities,Landmarks&language=[en|es|ja|pt|zh]'
    },
    describe: {
      url: '/describe',
      params: '?maxCandidates=12&language=[en|es|ja|pt|zh]'
    },
    detect: {
      url: 'detect'
    },
    areaOfInterest: {},
    generateThumbnail: {},
    ocr: {},
    read: {},
    tag: {
      url: '/tag',
      params: '?language=en'
    }
  };

  const headers = {
    content_type: {
      json: 'application/json',
      binary: 'application/octet-stream',
      form: 'multipart/form-data'
    }
  };


  const url = process.env.azure_computer_vision_api_url + endpoints[endpoint].url;

  const fetch_options = {
    method: 'POST',
    headers: {
      'Content-Type': headers.content_type.binary,
      'Content-Length': fs.statSync(imgFilePath).size,
      'Ocp-Apim-Subscription-Key': process.env.azure_computer_vision_api_key
    },
    body: fs.readFileSync(imgFilePath)
  };

  console.log('Requesting image analysis from Azure\'s Computer Vision API...');
  return fetch(url, fetch_options)
  .then(res => {
    if (!res.ok || res.error) {
      console.log('Error -> analyzeImageWithAzure() -> fetch().then', res);
      throw {
        "error": res.error || '',
        status: res.status,
        statusText: res.statusText
      };
    }
    return res.json();
  })
  .catch(err => {
    console.error('Error ->analyzeImageWithAzure() -> fetch().catch', err);
    throw err;
  });
}
