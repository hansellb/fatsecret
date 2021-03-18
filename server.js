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
const { URLSearchParams } = require('url');

const app = express();

const mongo_conn_str = `mongodb+srv://${process.env.mongodb_user}:${process.env.mongodb_pass}@cluster0.xu9wm.mongodb.net/test?retryWrites=true&w=majority`;
const mongo_opts = {
  useUnifiedTopology: true // Remove "DeprecationWarning: current Server Discovery and Monitoring..."
};

let fatSecret = {};
// mongoClient.connect(mongo_conn_str, mongo_opts, (err, client) => {
//  if (err) return console.error(err)
//  console.log('Connected to Database!')
//});

// Using promises in mongoClient
mongoClient.connect(mongo_conn_str, mongo_opts)
  .then(client => {
    console.log('Connected to MongoDB Atlas DB!!!')
    const db = client.db('test1');
    const collection = db.collection('collection1');

    // make all the files in 'public' available
    // https://expressjs.com/en/starter/static-files.html

    app.use(express.static("public"));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.raw());
    app.use(fileupload({
      limits: {
        fileSize: 25 * 1024 * 1024
      },
      useTempFiles: true,
      tempFileDir: '/tmp'
    }));



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



    app.post('/img', (req, res) => {
      console.log(req);
      if (!req.files || !req.files.img_b64) {
        return res.status(400).send({ error: 'You have to POST a file (img_b64)'});
      }

      const options = {
        encoding: 'base64'
      };

      fs.readFile(req.files.img_b64.tempFilePath, options, (err, data) => {
        if (err) {
          throw err;
        }

        console.log(data);
        res.status(200).send();
      });
    });



    app.get('/food', (req, res) => {
      console.log(req);
      console.log(req.params, req.query);
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
        return response.status(400).json({ error: 'Payload MUST have weight and img_b64!!!'});
      }

      if (!request.files || !request.files.img) {
        return response.status(400).json({ error: 'No image received!!!'});
      }


      let img_b64;
      try {
        img_b64 = fs.readFileSync(request.files.img.tempFilePath, { encoding: 'base64' });

      } catch (err) {
        return response.status(500).json({ error: 'Could not read image: ' + err });
      }

      let imgLabels;
      let food;

      getImgLabels(img_b64)
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

        imgLabels = resImg.responses[0].labelAnnotations.filter(label => {
          const regex = new RegExp(".*(food|fruit|plant)(s)*.*", "gi");
          return !regex.test(label.description);
        });
//        console.dir(imgLabels);
        return searchFoods(imgLabels[0].description);
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
            labelsFound: imgLabels,
            infoFound: resFoods
          });
        }
//        console.dir(resFoods.foods.food);
        food = resFoods.foods.food.filter(food => food.food_type==='Generic')[0];

        if (!food) {
          throw ({
            error: 'Could not find any info about the food',
            status: 404,
            labelsFound: imgLabels,
            infoFound: resFoods
          });
        }

        return searchFoodDetails(food.food_id);
      })
      .then(resFoodDetails => {
        const servingDetails = resFoodDetails.food.servings.serving
        .filter(serving => serving.serving_description === '100 g' && serving.measurement_description === 'g');

        return response.status(200).send({
          "message": 'weight was ' + request.body.weight,
          "food_info": {
            "name": resFoodDetails.food.food_name,
            "summary": food.food_description,
            "details": servingDetails
          },
          "imgLabels": imgLabels
        });
      })
      .catch(err => {
        console.error('Error -> POST /food -> getImgLabels().then.then.then.catch', err);
        response.status(err.status || 400).json(err);
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

//       getImgLabels(request.body.img_b64)
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
//         console.error('Error -> POST /food -> getImgLabels().then.then.then.catch', err);
//         response.status(400).send(err);
//       });

//     });



    app.get('*', (req, res) => {
      res.sendStatus(200);
    });

    // listen for requests :)
    const listener = app.listen(process.env.PORT, () => {
      console.log("Your app is listening on port " + listener.address().port);
    });
  })
  .catch(err => {
    console.error(err);
  });

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
  let url = 'https://oauth.fatsecret.com/connect/token';
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

  let url = 'https://platform.fatsecret.com/rest/server.api';

  const params = new URLSearchParams();
  params.append('method', 'foods.search');
  params.append('search_expression', searchStr);
  params.append('format', 'json');
  params.append('page_number', 0);
  params.append('max_results', 2);

  let options = {
    method: 'post',
    body:    params,
    headers: { 'Authorization': 'Bearer ' + fatSecret.access_token.value }
  };

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

  return fetch(process.env.fatsecret_url, options)
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
 * @param {*} imgBase64
 * @returns all the labels identified by Google's Vision API
 */
async function getImgLabels(imgBase64) {
  const url = 'https://vision.googleapis.com/v1/images:annotate?key=' + process.env.vision_api_key;

  const payload = {
    "requests": [
      {
        "image": {
          "content": imgBase64
        },
        "features": [
          {
            "type": "LABEL_DETECTION",
            "maxResults": 5
          }
        ]
      }
    ]
  };

  const options = {
    method: 'POST',
    body: JSON.stringify(payload) // JSON.stringify is a MUST, otherwise, Google Vision API returns 400 Bad Request
  };

  return fetch(url, options)
  .then(res => {
//    console.log('Response -> getImgLabels() -> fetch().then', res)
    if (!res.ok || res.error) {
      console.log('Error -> getImgLabels() -> fetch().then', res);
      throw {
        "error": res.error || '',
        status: res.status,
        statusText: res.statusText
      };
    }
    return res.json();
  })
  .catch(err => {
    console.error('Error ->getImgLabels() -> fetch().catch', err);
    throw err;
  });
}

/**
 * Make a request to Google Vision API to get image labels
 * Uses @google-cloud/vision Node.js library
 * @param base64Img image's Base64 encoded value
 */
async function getImgLabelsUsingLibrary(base64Img) {
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

