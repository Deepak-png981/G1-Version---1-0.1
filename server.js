



// //gpt 
// // MongoDB connection
// require('./config/db');

// const express = require('express');
// const app = express();
// const path = require('path');
// const UserRouter = require('./api/User');
// const passport = require('passport');
// const session = require('express-session');


// // Middleware to serve static files from the 'views' directory
// app.use(express.static('views'));
// app.use(express.static(path.join(__dirname, 'public')));
// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));

// // Middleware for parsing the body of a request
// app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
// app.use(express.json()); // For parsing application/json
// app.use(session({
//     secret: 'sfgsdgfdfg',
//     resave: false,
//     saveUninitialized: false
// }));

// app.use(passport.initialize());
// app.use(passport.session());


// // function 
// function ensureAuthenticated(req, res, next) {
//     if (req.isAuthenticated()) {
//         return next();
//     } else {
//         res.redirect('/login');
//     }
// }




// // Route to serve the landing page
// app.get('/', (req, res) => {
//     res.sendFile(__dirname + '/views/landing.html');
// });
// app.get('/onboarding1', (req, res) => {
//     res.sendFile(path.join(__dirname, '/views/onboarding1.html'));
// })
// // Route to serve the signup page
// app.get('/signup', (req, res) => {
//     res.sendFile(path.join(__dirname, '/views/signup.html'));
// });
// app.get('/login', (req, res) => {
//     res.sendFile(path.join(__dirname, '/views/login.html'));
// });

// app.get('/dashboard', ensureAuthenticated, (req, res) => {
//     const userName = req.user.name;  // Fetch this from your database or session
//     res.render('dashboard', { name: userName });
// });
// // Mount the user-related routes
// app.use('/user', UserRouter);

// // Start the server
// app.listen(process.env.PORT, () => {
//     console.log(`Server is running fine on http://localhost:${process.env.PORT}`);
// });








// MongoDB connection
require('./config/db');

const express = require('express');
const app = express();
const path = require('path');
const UserRouter = require('./api/User');
const passport = require('passport');
const session = require('express-session');

// Middleware to serve static files
app.use(express.static('views'));
app.use(express.static(path.join(__dirname, 'public')));

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware for parsing the body of a request
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Initialize Passport and session
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Middleware to ensure user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        // Redirect to login page if not authenticated
        res.redirect('/login');
    }
}


// Route to serve the landing page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/landing.html');
});

app.get('/onboarding1', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '/views/onboarding/onboarding1.html'));
});
app.get('/onboarding2', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '/views/onboarding/onboarding2.html'));
});
app.get('/onboarding3', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '/views/onboarding/onboarding3.html'));
});
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/signup.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/login.html'));
});



app.get('/dashboard', ensureAuthenticated, (req, res) => {
    const userName = req.user.name;  // Fetch this from your user object in session
    res.render('dashboard', { name: userName });
});

// Mount the user-related routes
app.use('/user', UserRouter);

// Start the server
app.listen(process.env.PORT, () => {
    console.log(`Server is running fine on http://localhost:${process.env.PORT}`);
});
