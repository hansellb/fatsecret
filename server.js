require('dotenv').config();
const db                  = require('./db/mongodb');
// const bodyParsers         = require('body-parser');
// const cookieParser        = require('cookie-parser');
const cors                = require('cors');
const crypto              = require('crypto');
const flash               = require('connect-flash');
const express             = require('express');
const exprshndlbrs        = require('express-handlebars');
const exprssession        = require('express-session');
const methodOverride      = require('method-override');
const fetch               = require('node-fetch');
const fileupload          = require('express-fileupload');
const fs                  = require('fs');
const morgan              = require('morgan');
const os                  = require('os');
const passport            = require('passport');
const path                = require('path');
// const routerIndex         = require('./routes/index');
// const routerLogin         = require('./routes/login');
// const routerLogout        = require('./routes/logout');
// const routerSignup        = require('./routes/signup');
// const routerSmarty        = require('./routes/smarty');
// const routerUser          = require('./routes/user');
const swaggerUi           = require('swagger-ui-express');
const { URLSearchParams } = require('url');
const yaml                = require('js-yaml');

const app = express();

// Holds the most recently generated access token to use FatSecret API
let fatSecretAccessToken = {};

// View engine setup Handlebars - https://www.npmjs.com/package/express-handlebars
const hndlbrs = exprshndlbrs.create({
  defaultLayout: 'main'
});
app.engine('.hbs', exprshndlbrs({ extname: '.hbs' }));
//app.set('views', path.join(__dirname, 'views')); // This is the default
app.set('view engine', '.hbs');

// Create the swagger docs https://swagger.io/docs/specification/basic-structure/
const swaggerDoc = yaml.load(fs.readFileSync('swagger.yml', 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Setup Morgan logger - https://expressjs.com/en/resources/middleware/morgan.html
app.use(morgan('common', {
  immediate: false // Write log line on request instead of response. This means that a requests will be logged even if the server crashes, but data from the response (like the response code, content length, etc.) cannot be logged.
}));

// Make all files in the "public" directory (in the same level as this file) available as static files at the "/" url
app.use(express.static('public'));

// Create tmp dir to hold smarty images
const tmpdir  = path.join(os.tmpdir(), 'smarty');
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

// Make all files in the ${tmpdir} directory available as static files at the "/" url
app.use(express.static(tmpdir));

// Parse request body and URL and extract JSON object and query parameters
app.use(express.json()); // Extract a JSON object
app.use(express.urlencoded({ extended: true })); // Extract query parameters
app.use(express.raw()); // Extract raw

// Extract files from the request
app.use(fileupload({
  limits: {
    fileSize: 25 * 1024 * 1024
  },
  useTempFiles: true,
  tempFileDir: tmpdir,
  safeFileNames: true,
  preserveExtension: true
}));



//
app.use(methodOverride('X-HTTP-Method-Override'));
// From https://www.npmjs.com/package/express-session, since version 1.5.0, cookie-parser middleware is no longer needed.
// However, from https://www.npmjs.com/package/cookie-parser, signed cookies are not parsed if no secret is specified
// If cookie-parser and express-session are used together, both need to have the same secret.
// app.use(cookieParser());
// app.use(cookieParser(secret, options)); // Using cookie-parser with secret(string or array)
app.use(exprssession({
  cookie: {
    httpOnly: true,
    maxAge: 60000,
    path: '/',
    secure: false
  },
  name: 'smarty',
  resave: false,
  saveUninitialized: false,
  secret: process.env.cookie_secret
}));
// app.use(require('express-session')({ name: 'smarty', resave: false, saveUninitialized: false, secret: process.env.cookie_secret }));

// Setup connect-flash BEFORE passport.initialize (Passport.js uses connect-flash)
app.use(flash());

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

// Make the authenticated user object available in views
app.use((req, res, next) => {
  // isAuthenticated is added by Passport.js, therefore, this middleware MUST
  // be added AFTER passport.session
  res.locals.isUserAuthenticated = req.isAuthenticated();
  next();
});

// Make connect-flash messages available to templates through res.locals
app.use(function(req, res, next) {
  // console.log('\n*************** req.session ***************\n', req.session);
  // console.log('\n*******************************************\n');
  // console.dir(req.flash);
  var msgs = req.session.messages || [];
  res.locals.messages = { test: 'test msg', ...msgs };

  // Get ALL connect-flash messages
  res.locals = { ...res.locals, ...req.flash() }

  // // Get specific connect-flash messages
  // res.locals.messageFailure = req.flash('messageFailure');
  // res.locals.messageSuccess = req.flash('messageSuccess');

  // res.locals.hasMessages = !! msgs.length;
  // req.session.messages = [];
  console.log('\n*************** res.locals* ***************\n', res.locals);
  console.log('\n*******************************************\n');
  next();
});



// Listen for requests AFTER a successful connection to the DB
db.init().then(() => {
  // Routes setup
  // https://expressjs.com/en/starter/basic-routing.html
  app.use(require('./routes'));

  // Catch ALL - Should be the LAST route, otherwise, it will take precedence
  app.get('*', (req, res) => {
    res.sendStatus(404);
  });

  const listener = app.listen(process.env.PORT, () => {
    // const currDate = new Date();
    console.log(`[${new Date().toISOString()}] ` + "Your app is listening on port " + listener.address().port);
  });
});



/**
 * GET /img
 *
 * Returns a JSON object with a property containing an array of all images in the server
 */
app.get('/img', cors(), (req, res) => {
  let imgsHtml = '<div class="flex-container">';

  const imgsDir = fs.opendirSync(tmpdir);
  let dirEntity;
  let imgNames = [];

  while ((dirEntity = imgsDir.readSync()) !== null) {
    if (dirEntity.isFile()) {
      imgsHtml += '<div class="img-container" onclick=deleteImage("' + dirEntity.name + '")><div class="delete-overlay">Click to delete</div><img src="' + dirEntity.name + '"></div>';
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

/**
 * POST /img
 *
 * Receives and stores the first uploaded image
 */
app.post('/img', (req, res) => {
  if (!req.files) {
    return res.status(400).json({ error: 'No image received!!!' });
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
    res.status(200).json({ message: `File successfully uploaded!!! -> ${firstFile.name}@${imgFilePath}` });
  });
});

/**
 * DELETE /img
 *
 * Deletes an image
 */
app.delete('/img/:imgName', (req, res) => {
  if (!req.params || !req.params.imgName) {
    return res.status(400).json({ error: 'No image received!!!' });
  }

  const imgFile = path.join(tmpdir, req.params.imgName);

  // Using Node.js File System Promises
  // According to Node.js documentation, it is not recommended to use fs.stat or fs.access
  // before fs.open(), fs.readFile() or fs.writeFile(), as it introduces a race condition
  // Note: rm & rmSync are only available in Node.js > 14
  fs.promises.rm(imgFile, { force: true })
    .then(result => {
      // Promise fulfils with "undefined" upon success: https://nodejs.org/api/fs.html#fs_fspromises_rm_path_options
      return res.status(200).json({ message: 'Image deleted successfully!!!' });
    })
    .catch(error => {
      // According to https://nodejs.org/api/fs.html#fs_fs_rm_path_options_callback
      // "error" is an Error object: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
      return res.status(500).json(JSON.stringify(error));
    });
});



/**
 * POST /food
 *
 * Takes the first image received in the request and analyses it using the Google Vision API
 *
 * After getting the image labels and filtering out irrelevant labels, use the first relevant
 * label to search for foods in the FatSecret API
 *
 * The returned foods are filtered out (only generic foods), and details for the
 * first food ID are fetched from FatSecret
 *
 *
 */
app.post('/food', (request, response) => {
  // Make sure the request contains a valid payload
  if (!request.body || !request.body.weight) {
    return response.status(400).json({ error: 'Invalid or empty payload received!!!' })
  }

  // Make sure the request contains a file
  if (!request.files) {
    return response.status(400).json({ error: 'No image received!!!' });
  }

  // Get the first file in the request
  const firstFileKey = Object.keys(request.files)[0];
  const firstFile = Object.prototype.toString.call(request.files[firstFileKey]) === '[object Array]' ?
    request.files[firstFileKey][0] : request.files[firstFileKey];
  const imgFilePath = firstFile.tempFilePath;

  let allImgLabels;
  let filteredImgLabels;
  let searchTerm;
  let allFoods;
  let food;

  // Send the image to Google Vision API
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

      // Filter the image labels
      allImgLabels = resImg.responses[0].labelAnnotations;
      filteredImgLabels = allImgLabels.filter(label => {
        const regex = new RegExp(".*(food|fruit|plant)(s)*.*", "gi");
        return !regex.test(label.description);
      });

      // Make sure at least one label remains after the filter
      if (!filteredImgLabels.length) {
        throw ({
          error: 'Could not detect food from image',
          status: 404,
          labelsFound: allImgLabels
        });
      }

      const selectedImgLabel = filteredImgLabels[0];
      searchTerm = selectedImgLabel.description;

      // Search for the image label in FatSecret API
      return searchFoods(searchTerm);
    })
    .then(resFoods => {
      if (resFoods.error) {
        throw ({
          error: resFoods.error,
          status: 500
        });
      }

      // Verify that the FatSecret API returned some results
      if (!resFoods || !resFoods.foods || !resFoods.foods.food || resFoods.total_results == 0) {
        throw ({
          error: 'Could not find any info about the food',
          status: 404,
          labelsFound: allImgLabels,
          infoFound: resFoods
        });
      }

      // Filter out non-Generic (Branded) foods
      allFoods = resFoods.foods.food;
      food = resFoods.foods.food.filter(food => food.food_type === 'Generic')[0];

      // Make sure at there are foods after filtering them
      if (!food) {
        throw ({
          error: 'Could not find any info about the food',
          status: 404,
          labelsFound: allImgLabels,
          infoFound: resFoods
        });
      }

      // Search the food details using FatSecret API
      return searchFoodDetails(food.food_id);
    })
    .then(resFoodDetails => {
      const servingDetails = resFoodDetails.food.servings.serving
        .filter(serving => serving.serving_description === '100 g' && serving.measurement_description === 'g');
      const resp = {
        "message": 'weight was ' + request.body.weight,
        "searchTerm": searchTerm,
        "food_info": {
          "name": resFoodDetails.food.food_name,
          "summary": food.food_description,
          "details": servingDetails
        },
        "allImgLabels": allImgLabels,
        "allFoods": allFoods
      };

      // Send the successful response
      return response.status(200).send(resp);
    })
    .catch(err => {
      console.error('Error -> POST /food -> analyzeImageWithGoogle().then.then.then.catch', err);
      return response.status(err.status || 500).json(err);
    });

});



/**
 * POST /compare
 *
 * Sends an image analysis request to:
 * - Google Vision API
 * - Azure Computer Vision API
 * - AWS Rekognition API
 * - Clarifai API
 *
 * After all API responses are received, build a JSON object with the results for each API
 */
app.post('/compare', (request, response) => {
  if (!request.body) {
    return response.status(400).json({ error: 'No payload received!!!' })
  }

  if (!request.files) {
    return response.status(400).json({ error: 'No image received!!!' });
  }

  const imgFilePath     = request.files[Object.keys(request.files)[0]].tempFilePath;
  const awsRequest      = analyzeImageWithAWS(imgFilePath);
  const azureRequest    = analyzeImageWithAzure(imgFilePath, 'tag');
  const clarifaiRequest = analyzeImageWithClarifai(imgFilePath);
  const googleRequest   = analyzeImageWithGoogle(imgFilePath)

  Promise.all([awsRequest, azureRequest, clarifaiRequest, googleRequest])
    .then((values) => {
      const awsResp       = values[0];
      const azureResp     = values[1];
      const clarifaiResp  = values[2];
      const googleResp    = values[3];

      // console.log('AWS:', awsResp);
      // console.log('Azure:', azureResp);
      // console.log('Clarifai:', clarifaiResp);
      // console.log('Google:', googleResp);

      let awsLabels;
      let azureTags;
      let googleLabels;
      let clarifaiConcepts;

      // Check if AWS returned any labels
      awsLabels = awsResp && awsResp.Labels

      // Check if Azure returned any tags
      azureTags = azureResp && azureResp.tags;

      // Check if Clarifai returned any concepts
      clarifaiConcepts = clarifaiResp && clarifaiResp.outputs && clarifaiResp.outputs[0] && clarifaiResp.outputs[0].data && clarifaiResp.outputs[0].data.concepts;

      // Check if Google returned any labels
      googleLabels = googleResp && googleResp.responses && googleResp.responses[0].labelAnnotations;

      const resp = {
        aws:      awsLabels,
        azure:    azureTags,
        clarifai: clarifaiConcepts,
        google:   googleLabels
      };

      // console.log(resp);
      return response.status(200).json(resp);
    })
    .catch(error => {
      console.error('Error -> POST /compare -> Promise.all.catch', error);
      return response.status(error.status || 500).json(error);
    });
});





/**
 * Verify if the FatSecret Access Token has expired
 *
 * @returns true if the the FatSecret Access Token has expired
 */
function expiredFatSecretAccessToken() {
  if (!fatSecretAccessToken || !fatSecretAccessToken.created_tms) {
    return true;
  }

  const created_tms = fatSecretAccessToken.created_tms;
  const expired_tms = new Date(Date.now() - fatSecretAccessToken.expires_in * 1000)

  return expired_tms > created_tms;
}

/**
 * Get an Access Token from FatSecret
 **/
async function getFatSecretAccessToken() {
  let url = process.env.fatsecret_access_token_url;
  let authString = `${process.env.fatsecret_user}:${process.env.fatsecret_pass}`

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('scope', 'basic');

  let options = {
    method:   'post',
    body:     params,
    headers:  { 'Authorization': 'Basic ' + Buffer.from(authString).toString('base64') }
  };

  console.log('Requesting a new FatSecret Access Token...');
  const response  = await fetch(url, options);
  const data      = await response.json();

  fatSecretAccessToken = {
    value:        data.access_token,
    created_tms:  new Date(),
    expires_in:   data.expires_in
  };
}

/**
 * Get food search results from FatSecret
 *
 * @param {*} searchStr The string to use as a search term in the API
 * @returns A Promise with the API call results
 */
async function searchFoods(searchStr) {
  if (expiredFatSecretAccessToken()) {
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
    method:   'post',
    body:     params,
    headers:  { 'Authorization': 'Bearer ' + fatSecretAccessToken.value }
  };

  console.log(`Requesting search results for "${searchStr}" from FatSecret API...`);
  return fetch(url, options)
    .then(res => {
      //    console.log('5. Response -> searchFoods() -> fetch().then');
      if (!res.ok || res.error) { // same as res.status >= 200 && res.status < 300 according to: https://www.npmjs.com/package/node-fetch#handling-client-and-server-errors
        console.log('Error -> searchFoods() -> fetch().then', res);
        throw {
          "error":    res.error || '',
          status:     res.status,
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
 * Get the details of a specific food using FatSecret API
 *
 * @param {*} foodId FatSecret food ID
 * @returns A Promise with the results of the API call
 */
async function searchFoodDetails(foodId) {
  if (expiredFatSecretAccessToken()) {
    await getFatSecretAccessToken();
  }
  const url     = process.env.fatsecret_api_url;
  const params  = new URLSearchParams();
  params.append('method', 'food.get.v2');
  params.append('food_id', foodId);
  params.append('format', 'json');

  let options = {
    method:   'post',
    body:     params,
    headers:  { 'Authorization': 'Bearer ' + fatSecretAccessToken.value }
  };

  console.log('Requesting FOOD DETAILS from FatSecret API...');
  return fetch(url, options)
    .then(res => {
      //    console.log('Response -> searchFoodDetails() -> fetch().then');
      if (!res.ok || res.error) {
        console.log('Error -> searchFoodDetails() -> fetch().then', res);
        throw {
          "error":    res.error || '',
          status:     res.status,
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
 * @returns A Promise with the reponse from the API call (all the labels identified by Google's Vision API)
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
    body:   JSON.stringify(payload) // JSON.stringify is a MUST, otherwise, Google Vision API returns 400 Bad Request
  };

  console.log('Requesting image analysis from Google\'s Vision API...');
  return fetch(url, options)
    .then(res => {
      //    console.log('Response -> analyzeImageWithGoogle() -> fetch().then', res)
      if (!res.ok || res.error) {
        console.log('Error -> analyzeImageWithGoogle() -> fetch().then', res);
        throw {
          "error":    res.error || '',
          status:     res.status,
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
async function analyzeImageWithAzure(imgFilePath, endpoint) {
  const endpoints = {
    analyze: {
      url:    '/analyze',
      params: '?visualFeatures=Adult,Brands,Categories,Color,Description,Faces,ImageType,Objects,Tags&details=Celebrities,Landmarks&language=[en|es|ja|pt|zh]'
    },
    describe: {
      url:    '/describe',
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
      url:    '/tag',
      params: '?language=en'
    }
  };

  const headers = {
    content_type: {
      json:   'application/json',
      binary: 'application/octet-stream',
      form:   'multipart/form-data'
    }
  };

  const url = process.env.azure_computer_vision_api_url + endpoints[endpoint].url;

  const fetch_options = {
    method:   'POST',
    headers:  {
      'Content-Type':               headers.content_type.binary,
      'Content-Length':             fs.statSync(imgFilePath).size,
      'Ocp-Apim-Subscription-Key':  process.env.azure_computer_vision_api_key
    },
    body: fs.readFileSync(imgFilePath)
  };

  console.log('Requesting image analysis from Azure\'s Computer Vision API...');
  return fetch(url, fetch_options)
    .then(res => {
      if (!res.ok || res.error) {
        console.log('Error -> analyzeImageWithAzure() -> fetch().then', res);
        throw {
          "error":    res.error || '',
          status:     res.status,
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

/**
 * Use Clarifai API to get image concepts (identify what is in the image)
 *
 * @param {*} imgFilePath path to the image file to send along with the request
 * @returns all the concepts identified by Clarifai's API
 */
async function analyzeImageWithClarifai(imgFilePath) {
  const modelId         = '9504135848be0dd2c39bdab0002f78e9'; // Food Model V2
  const modelVersionId  = '1d5fd481e0cf4826aa72ec3ff049e044'; // Version 2020-10-16
  const url             = process.env.clarifai_api_url + `/models/${modelId}/versions/${modelVersionId}/outputs`;

  const payload = {
    "inputs": [
      {
        "data": {
          "image": {
            "base64": fs.readFileSync(imgFilePath, { encoding: 'base64' })
          }
        }
      }
    ]
  };

  const options = {
    method:   'POST',
    headers:  { 'Authorization': `Key ${process.env.clarifai_api_key}` },
    body:     JSON.stringify(payload)
  };

  console.log('Requesting image analysis from Clarifai\'s API...');
  return fetch(url, options)
    .then(res => {
      //    console.log('Response -> analyzeImageWithClarifai() -> fetch().then', res)
      if (!res.ok || res.error) {
        console.log('Error -> analyzeImageWithClarifai() -> fetch().then', res);
        throw {
          "error":    res.error || '',
          status:     res.status,
          statusText: res.statusText
        };
      }
      return res.json();
    })
    .catch(err => {
      console.error('Error ->analyzeImageWithClarifai() -> fetch().catch', err);
      throw err;
    });
}

/**
 * Use AWS Rekognition API to get image concepts (identify what is in the image)
 *
 * @param {*} imgFilePath path to the image file to send along with the request
 * @returns all the concepts identified by AWS' Rekognition API
 */
async function analyzeImageWithAWS(imgFilePath) {
  // // Example from Tasks 1-4 at https://docs.aws.amazon.com/general/latest/gr/sigv4_signing.html
  // const url            = 'https://iam.amazonaws.com/?Action=ListUsers&Version=2010-05-08';
  // const tms            = '20150830T123600Z';
  // const payload        = '';
  // const hashedPayload  = crypto.createHash('sha256').update(payload).digest('hex');
  // const options        = {
  //   method: 'GET',
  //   headers: {
  //     'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
  //     'X-Amz-Date': tms
  //   },
  // };
  // const credentials            = { accessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY', secretKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY' };

  const url     = process.env.aws_rekognition_api_url;
  const tms     = new Date().toISOString().replace(/(\.[0-9]+|[-:])/g, '');
  const payload = JSON.stringify({
    "Image": {
      "Bytes": fs.readFileSync(imgFilePath, { encoding: 'base64' })
    },
    "MaxLabels": 25
  });

  const hashedPayload = crypto.createHash('sha256').update(payload).digest('hex');

  const options = {
    method: 'POST',
    headers: {
      'Content-Type':         'application/x-amz-json-1.1',
      'X-Amz-Target':         'RekognitionService.DetectLabels',
      'X-Amz-Date':           tms,
      'X-Amz-Content-Sha256': hashedPayload
    },
    body: payload
  };

  const credentials = JSON.parse(process.env.aws_rekognition_api_credentials);

  const requestParams = {
    url:            url,
    method:         options.method,
    headers:        options.headers,
    hashedPayload:  hashedPayload,
    tms: tms
  };

  const awsParams = {
    region:     'eu-central-1',
    service:    'rekognition',
    accessKey:  credentials.accessKey,
    secretKey:  credentials.secretKey,
  }

  const authHeader = generateAuthorizationHeader(requestParams, awsParams);

  options.headers['Authorization'] = authHeader;

  console.log('Requesting image analysis from AWS\' API...');
  return fetch(url, options)
    .then(res => {
      // console.log('Response -> analyzeImageWithAWS() -> fetch().then', res)
      if (!res.ok || res.error) {
        console.log('Error -> analyzeImageWithAWS() -> fetch().then', res);
        throw {
          "error":    res.error || '',
          status:     res.status,
          statusText: res.statusText
        };
      }
      return res.json();
    })
    .catch(err => {
      console.error('Error ->analyzeImageWithAWS() -> fetch().catch', err);
      throw err;
    });
}

/**
 *
 * @param {*} requestParams
 * @returns
 */
function buildCanonicalRequestString(requestParams) {
  // https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html#canonical-request
  const urlRegExp             = /(?<scheme>https|http)?(:\/\/)?(?<host>[0-9a-zA-Z\-\.]+)(?<path>([0-9a-zA-Z\-\/\.]+))?(?<query>(\?)[0-9a-zA-Z=&\-]+)?/g;
  const canonicalURI          = requestParams.url.replace(urlRegExp, '$<path>') || '/';
  const canonicalQueryString  = requestParams.url.replace(urlRegExp, '$<query>').substring(1);

  // Add the Host header
  requestParams.headers['Host'] = requestParams.url.replace(urlRegExp, '$<host>');

  let canonicalHeaders  = '';
  let signedHeaders     = '';

  // TODO: headers should be sorted after they are all lowercase
  // Sort headers alfabetically
  Object.keys(requestParams.headers).sort().forEach(header => {
    canonicalHeaders  += header.toLowerCase() + ':' + requestParams.headers[header] + '\n';
    signedHeaders     += ';' + header.toLowerCase();
  });
  // canonicalHeaders = canonicalHeaders.trim();
  signedHeaders = signedHeaders.substring(1);

  // Build the Canonical Request
  const canonicalRequestString =  requestParams.method          + '\n' +
                                  canonicalURI                  + '\n' +
                                  canonicalQueryString          + '\n' +
                                  canonicalHeaders              + '\n' +
                                  signedHeaders                 + '\n' +
                                  requestParams.hashedPayload;

  return canonicalRequestString;
}

/**
 * Creates the required Authorization header used by AWS
 *
 * @param {*} requestParams
 * @param {*} awsParams
 * @returns
 */
function generateAuthorizationHeader(requestParams, awsParams) {
  const canonicalRequestString  = buildCanonicalRequestString(requestParams);
  const canonicalRequestArray   = canonicalRequestString.split('\n');
  const signedHeaders           = canonicalRequestArray[canonicalRequestArray.length - 2];
  const hashedCanonicalRequest  = crypto.createHash('sha256').update(canonicalRequestString).digest('hex');

  // https://docs.aws.amazon.com/general/latest/gr/sigv4-create-string-to-sign.html
  const shortDate     = requestParams.tms.substring(0, 8);
  const authAlgorithm = 'AWS4-HMAC-SHA256';
  const authScope     = shortDate + '/' + awsParams.region + '/' + awsParams.service + '/aws4_request';

  const strToSign = authAlgorithm           + '\n' +
                    requestParams.tms       + '\n' +
                    authScope               + '\n' +
                    hashedCanonicalRequest;

  const DateKey               = hmacSha256('AWS4' + awsParams.secretKey, shortDate);
  const DateRegionKey         = hmacSha256(DateKey, awsParams.region);
  const DateRegionServiceKey  = hmacSha256(DateRegionKey, awsParams.service);
  const SigningKey            = hmacSha256(DateRegionServiceKey, 'aws4_request');

  // Setting the encoding to something other than empty string ('') or null,
  // will create a double conversion (from Buffer to string and again from string to Buffer)
  // in the hmacSha256 function
  // const encoding   = 'latin1' // https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings
  // const SigningKey = hmacSha256(
  //   hmacSha256(
  //     hmacSha256(
  //       hmacSha256('AWS4' + awsParams.secretKey, shortDate, encoding),
  //       awsParams.region, encoding),
  //     awsParams.service, encoding),
  //   'aws4_request', encoding
  // );

  const signature   = hmacSha256(SigningKey, strToSign).toString('hex');
  const authHeader  = authAlgorithm + ' Credential=' + awsParams.accessKey + '/' + authScope + ',SignedHeaders=' + signedHeaders + ',Signature=' + signature;

  return authHeader;
}

/**
 *
 * @param {*} signingKey
 * @param {*} strToSign
 * @param {*} encoding
 * @returns
 */
function hmacSha256(signingKey, strToSign, encoding) {
  // According to https://docs.aws.amazon.com/general/latest/gr/sigv4-calculate-signature.html
  // The HMAC SHA256 function should use a digest (hash in binary format), and not a hexdigest (hash in hex format)
  // Looking at https://nodejs.org/api/crypto.html#crypto_hmac_digest_encoding
  // If encoding is provided a string is returned; otherwise a [Buffer/binary string](https://nodejs.org/api/buffer.html) is returned;
  // https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings
  const hash = crypto.createHmac('sha256', signingKey).update(strToSign).digest(encoding);

  return encoding ? Buffer.from(hash, encoding) : hash;
}