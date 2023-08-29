const express = require('express');
const router = express.Router();
const User = require('./../models/User');
const UserVerification = require('./../models/UserVerification');
//email handler
const nodemailer = require('nodemailer');
//unique string ke liye
const { v4: uuid4 } = require('uuid');
//env variables
require('dotenv').config();

const bcrypt = require('bcrypt');

//static file
const path = require('path');

const passport = require('passport');
//passport-local setup
const LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy({ usernameField: 'email' },
    async (email, password, done) => {
        try {
            const user = await User.findOne({ email: email });
            if (!user) {
                return done(null, false, { message: 'Incorrect email.' });
            }

            // Check if the user's email is verified
            if (!user.verified) {
                return done(null, false, { message: 'Email is not verified. Please check your inbox.' });
            }

            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) throw err;
                if (isMatch) return done(null, user);
                else return done(null, false, { message: 'Incorrect password.' });
            });
        } catch (err) {
            return done(err);
        }
    }
));



passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});





//nodemailer stuff
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS
    }
})
//TESTING success of my transporter
transporter.verify((error, success) => {
    if (error) {
        console.log("error in transporter ", error);
    } else {
        console.log("Ready for messages");
        console.log(success);
    }
})


router.post('/signup', (req, res) => {
    let { name, email, password } = req.body;
    name = name.trim(); //white space remove kerdi
    email = email.trim();
    password = password.trim();
    if (name == "" || email == "" || password == "") {
        return res.status(500).json({
            success: false,
            message: "Empty input field"
        })
    } else if (!/^[a-zA-Z ]*$/.test(name)) {
        return res.status(500).json({
            success: false,
            message: "Invalid name entered"
        })
    } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
        return res.status(500).json({
            success: false,
            message: "Invalid email entered"
        })
    } else if (password.length < 8) {
        return res.status(500).json({
            success: false,
            message: "Password is too short"
        })
    } else {
        // checking if user already exist
        User.find({ email }).then((result) => {
            if (result.length) {
                //user pehele se hai 
                res.status(500).json({
                    success: false,
                    message: "User already exist"
                })
            } else {
                //naya user bana rhe hai
                const saltRounds = 10;
                bcrypt.hash(password, saltRounds).then(hashedPassword => {
                    const newUser = new User({
                        name,
                        email,
                        password: hashedPassword,
                        verified: false,
                    });
                    newUser.save()
                        .then(result => {
                            // YAHA PER EMAIL VERIFICATION KERWA RAHA HOON
                            sendVerificationEmail(result, res);
                        }).catch(err => {
                            res.status(500).json({
                                success: false,
                                message: "An error occured while saving the user"
                            })
                        });
                }).catch(err => {
                    res.status(500).json({
                        success: false,
                        message: "An error occured while hashing the password"
                    })
                })
            }
        }).catch((err) => {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: "An error occured while checking for the existence of the user"
            })
        })
    }
});

//sernd verification email
const sendVerificationEmail = ({ _id, email }, res) => {
    //url jo ki main message mein daalunga email ke
    const currentUrl = "http://localhost:3000/";
    const uniqueString = uuid4() + _id;
    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Verify Your Email | G1 | ShunyaDotEk",
        html: `<p>Verify you email address to complete the signup and login into your account.</p> 
        <p>This link <b>expires in 6 hours</b></p>
        <p>Press <a href=${currentUrl + "user/verify/" + _id + "/" + uniqueString}>here</a> to proceed. </p>
        `,

    };
    // hash the unque string
    const saltRounds = 10;
    bcrypt
        .hash(uniqueString, saltRounds)
        .then((hashedUniqueString) => {
            // set values in userverification
            const newVerification = new UserVerification({
                userId: _id,
                uniqueString: hashedUniqueString,
                createdAt: Date.now(),
                expiresAt: Date.now() + 21600000,
            });
            newVerification
                .save()
                .then(() => {
                    transporter
                        .sendMail(mailOptions)
                        .then(() => {
                            // email bhejdi or save ho gaya email data

                            res.status(202).sendFile(path.join(__dirname, './../views/email_sent.html'));

                        })
                        .catch((err) => {
                            console.log(err);
                            res.status(500).json({
                                success: false,
                                message: "Verification email failed"
                            })
                        })
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).json({
                        success: false,
                        message: "Couldn't save the verification email data"
                    })
                });
        })
        .catch(() => {
            res.status(500).json({
                success: false,
                message: "An error occured while hashing the email data"
            })
        });


}

// verify email route
router.get("/verify/:userId/:uniqueString", (req, res) => {
    let { userId, uniqueString } = req.params;
    UserVerification
        .find({ userId })
        .then((result) => {
            if (result.length > 0) {
                //user verification record exist so we delete it
                const { expiresAt } = result[0];
                const hashedUniqueString = result[0].uniqueString;
                if (expiresAt < Date.now()) {
                    //no longer valid
                    UserVerification
                        .deleteOne({ userId })
                        .then(result => {
                            User.deleteOne({ _id: userId })
                                .then(() => {
                                    let message = "Link has expired. Please sign up again";
                                    res.redirect(`/user/verified/error=true&message=${message}`);
                                })
                                .catch((error) => {
                                    console.log(error);
                                    let message = "Clearing user with expired unique strig failed";
                                    res.redirect(`/user/verified/error=true&message=${message}`);
                                });
                        })
                        .catch((error) => {
                            console.log(error);
                            let message = "An error occured while clering the expired user verification details ";
                            res.redirect(`/user/verified/error=true&message=${message}`);
                        });
                } else {
                    // first comparing the hashed unique stringb
                    bcrypt
                        .compare(uniqueString, hashedUniqueString)
                        .then(result => {
                            if (result) {
                                //string match
                                User
                                    .updateOne(({ _id: userId }, { verified: true }))
                                    .then(() => {
                                        UserVerification
                                            .deleteOne({ userId })
                                            .then(() => {
                                                res.sendFile(path.join(__dirname, "./../views/verified.html"));
                                            })
                                            .catch((err) => {
                                                console.log(err);
                                                let message = "An error occured while finalizing successful verification";
                                                res.redirect(`/user/verified/error=true&message=${message}`);
                                            });
                                    })
                                    .catch((err) => {
                                        console.log(err);
                                        let message = "An error occured while updating user record to show verified";
                                        res.redirect(`/user/verified/error=true&message=${message}`);
                                    });
                            } else {
                                //string exists but not matched
                                let message = "Invalid verification detailed passed. Check your indbox";
                                res.redirect(`/user/verified/error=true&message=${message}`);
                            }
                        })
                        .catch(error => {
                            let message = "An error occured while comparing the unique string";
                            res.redirect(`/user/verified/error=true&message=${message}`);
                        });
                }
            } else {
                //user verification record nhi hai bhai
                let message = "Account record doesn't exist or has been verified already. Please sign up or login again. Team ShunyaDotEk";
                res.redirect(`/user/verified/error=true&message=${message}`);
            }
        })
        .catch((err) => {
            console.log(err);
            let message = "An error occured while checking for existing user verification record";
            res.redirect(`/user/verified/error=true&message=${message}`);
        });
})

// verify the page route
router.get("/verified", (req, res) => {
    res.sendFile(path.join(__dirname, "./../views/verified.html"));
})

router.post('/signin', function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        if (err) { return next(err); }
        if (!user) {
            if (info.message === 'Email is not verified. Please check your inbox.') {
                return res.status(202).sendFile(path.join(__dirname, './../views/please_verify.html'));
            }
            return res.status(500).json({ success: false, message: info.message });
        }
        req.logIn(user, function (err) {
            if (err) { return next(err); }
            return res.redirect('/onboarding1');
        });
    })(req, res, next);
});


router.post('/onboarding1', async (req, res) => {
    const { purpose, communitySize } = req.body;

    await User.findByIdAndUpdate(req.user._id, { purpose, communitySize }, { new: true })
        .then(updatedUser => {
            res.redirect('/onboarding2');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error updating onboarding data');
        });
});
router.post('/onboarding2', async (req, res) => {
    const features = req.body.features || []; // This will be an array of selected features

    await User.findByIdAndUpdate(req.user._id, { features }, { new: true })
        .then(updatedUser => {
            res.redirect('/onboarding3');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error updating onboarding data');
        });
});
router.post('/onboarding3', async (req, res) => {
    const { color, font, design } = req.body;

    await User.findByIdAndUpdate(req.user._id, { color, font, design }, { new: true })
        .then(updatedUser => {
            res.redirect('/dashboard');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error updating customization data');
        });
});


module.exports = router;