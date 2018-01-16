// Express / Handlebars setup
var express = require('express');
var app = express();
var path = require('path');
var handlebars = require('express-handlebars').create({
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials'),
    defaultLayout:'main'
});
app.disable('x-powered-by');
app.disable('view cache');
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('view options', { layout: 'landinglayout' });

//session / login
var session = require('express-session');
var passport = require('passport');
var pg = require('pg');
var pgSession = require('connect-pg-simple')(session);
var pgPool = new pg.Pool({
    user: 'website',
    host: '192.168.126.129',
    database: 'pflanzenwerkstatt',
    password: 'Pf14NZ3NW3RkS14T1',
    port: 5432
});
app.use(session({
    store: new pgSession({
        pool : pgPool                // Connection pool
    }),
    secret: 'I8UUH32ui8ahf14612i2uH2IUHiU3HI6ugiG',
    resave: false,
    saveUninitialized: false,
    //cookie: {secure:true}     //braucht https
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(function(req,res,next){
    res.locals.isAuthenticated = req.isAuthenticated();
    next();
})


var validate = require('uuid-validate');
// Server setup
app.set('port', process.env.PORT || 80);
app.use(express.static(__dirname + '/public'));

// Misc. imports
app.use(require('body-parser').urlencoded({
    extended: true
}));

// Database
var bcrypt = require('bcryptjs');
function convertTime(time){
    var newTime = "";
    var isSecond = false;
    for(var i = 0; i < time.length; i++){
        if(time.charAt(i) == ':' && isSecond){
            break;
        }if(time.charAt(i) == ':' && !isSecond){
            isSecond = true;
        }
        newTime += time.charAt(i);
    }
    return newTime
}
function convertDate(date){
    var newdate = new Date(date);
    var dateString = ""+newdate.getDate()+"."+(newdate.getMonth()+1)+"."+newdate.getFullYear();
    return dateString;
}
function getDate(){
    var datetime = new Date();
    var day = datetime.getDate();
    if(day < 10){
        day = "0"+day;
    }
    var month = (datetime.getMonth()+1);
    if(month < 10){
        month = "0"+month;
    }
    var year = datetime.getFullYear();
    var currentdate=""+year+"-"+month+"-"+day;
    return currentdate
}
function getTime(){
    var datetime = new Date();
    var hours = datetime.getHours();
    if(hours < 10){
        hours = "0"+hours;
    }
    var minutes = (datetime.getMinutes());
    if(minutes < 10){
        minutes = "0"+minutes;
    }
    var seconds = (datetime.getSeconds());
    if(seconds < 10){
        seconds = "0"+seconds;
    }
    var currenttime=""+hours+":"+minutes+":"+seconds;
    return currenttime
}


// Routes
app.get('/diy', function(req, res){
    res.render('diy');
});
app.get('/wissenswertes', function(req, res){
    res.render('wissenswertes');
});
app.get('/addnews', function(req, res){

    if(req.isAuthenticated()){
        const text = 'SELECT type FROM users WHERE uid = $1';
        const values = [req.user];
        pgPool.query(text, values, (err, result) => {
            if (err) {
                console.log(err.code);
                console.log(err.message);

            } else {
                // no errors
                if (result.rows[0].type == "admin"){
                    res.render('addnews');

                }
            }
        })
    }else{
        res.redirect('news');
    }

});
app.post('/likeComment', function(req, res){
    if(req.body.cid){

    }else{

    }
    if(req.isAuthenticated()){
        const text = 'SELECT cid FROM likes WHERE uid = $1';
        const values = [req.user];
        pgPool.query(text, values, (err, result) => {
            if (err) {
                console.log(err.code);
                console.log(err.message);
                res.send('ERROR');
            } else {
                // no errors
                cids = [];
                for(var i = 0; i < result.rows.length; i++){
                    cids.push(result.rows[i].cid);
                }
                if (cids.indexOf(req.body.cid) == -1){

                    pgPool.query('INSERT INTO likes VALUES($1,$2)', [req.body.cid,req.user], (err, result) => {
                        if (err) {
                            console.log(err.code);
                            console.log(err.message);
                            res.send('ERROR');
                        } else {
                            // no errors
                            res.send('liked');
                        }
                    })

                }else if(cids.indexOf(req.body.cid) != -1){
                    pgPool.query('DELETE FROM likes WHERE cid = $1 AND uid = $2', [req.body.cid,req.user], (err, result) => {
                        if (err) {
                            console.log(err.code);
                            console.log(err.message);
                            res.send('ERROR');
                        } else {
                            // no errors
                            res.send('notLiked');
                        }
                    })
                }
            }
        })
    }else{
        res.send('notLoggedIn');
    }
});
app.get('/experiment', function(req, res){
    const text = 'SELECT * FROM experiment NATURAL JOIN users WHERE eid = $1';
    const values = [req.query.eid];
    pgPool.query(text, values, (err, result) => {
        if (err) {
            if(err.code == '22P02'){
                res.redirect('404')
            }else{
                console.log(err.code);
                console.log(err.message);
                res.redirect('500');
            }
        } else {
            // no errors
            if(result.rows.length == 0){
                res.redirect('404');
            }else{
                var title = result.rows[0].title;
                var ctext = result.rows[0].text;
                var uname = result.rows[0].uname;
                var cdate = convertDate(result.rows[0].edate);
                var ctime = convertTime(result.rows[0].etime);
                var ceid = req.query.eid;

                pgPool.query('SELECT comment.cid,comment.parent,comment.text,comment.cdate,comment.ctime,users.uid,users.uname,count(likes.*) as "clikes" FROM comment JOIN users ON comment.uid = users.uid LEFT JOIN likes ON comment.cid = likes.cid WHERE eid = $1 GROUP BY comment.cid,users.uid,users.uname ORDER BY comment.parent DESC,clikes DESC, comment.cdate DESC,comment.ctime DESC', [ceid], (err, result) => {
                    if (err) {
                        if(err.code == '22P02'){
                            res.redirect('404')
                        }else{
                            console.log(err.code);
                            console.log(err.message);
                            res.redirect('500');
                        }
                    } else {
                        // no errors
                        var comments = [];

                        for(var i = 0; i < result.rows.length; i++){
                            var cid = result.rows[i].cid;
                            var uname = result.rows[i].uname;
                            var parent = result.rows[i].parent;
                            var text = result.rows[i].text;
                            var likes = result.rows[i].clikes;
                            var cdate = convertDate(result.rows[i].cdate);
                            var ctime = convertTime(result.rows[i].ctime);
                            if(parent){
                                for(var j = 0; j < comments.length; j++){
                                    if(comments[j].cid == parent){
                                        comments[j].children.push({"cid": cid,"cuname":uname,"cparent":parent,"ctext":text,"cdate":cdate,"ctime":ctime, "cupvotes":likes})
                                    }
                                }
                            }
                            comments.push({"cid": cid,"cuname":uname,"ctext":text,"cdate":cdate,"ctime":ctime,"cupvotes":likes,"children":[]})
                        }
                        res.render('experiment', {title: title, text: ctext, user: uname, date:cdate, time:ctime, eid:ceid, comments: comments});
                    }
                })
            }
        }
    })
});
app.get('/addExperiment', function(req, res){

    if(req.isAuthenticated()){
        res.render('addExperiment');
    }else{
        res.redirect('experimente');
    }

});
app.get('/experimente', function(req, res){

    const text = 'SELECT eid,uid, uname,title,text,edate,etime FROM experiment NATURAL JOIN users ORDER BY edate DESC,etime DESC';
    pgPool.query(text, (err, result) => {
        if (err) {
            console.log(err.code);
            console.log(err.message);

        } else {
            // no errors
            var experiments = [];
            for(var i = 0; i < result.rows.length; i++){
                var title = result.rows[i].title;
                var text = result.rows[i].text.substr(0, 80);
                var link = result.rows[i].eid;
                var date = convertDate(result.rows[i].edate);
                var time = convertTime(result.rows[i].etime);
                var user = result.rows[i].uname;
                experiments.push({"title":title,"text": text,"user":user,"link":link,"date":date,"time":time})
            }
            if(req.isAuthenticated()){
                const text3 = 'SELECT type FROM users WHERE uid = $1';
                const values3 = [req.user];
                pgPool.query(text3, values3, (err3, result3) => {
                    if (err3) {
                        console.log(err3.code);
                        console.log(err3.message);

                    } else {
                        // no errors
                        var isAdmin = false;
                        if (result3.rows[0].type == "admin"){
                            isAdmin = true;
                        }
                        res.render('experiments', {experiment:experiments, admin:isAdmin});
                    }
                })
            }else{
                res.render('experiments', {news:newsEntries, admin:false, expandButton:false});
            }
        }
    })

});

app.get('/news', function(req, res){
    if(req.query.view == "all"){
        const text = 'SELECT * FROM news ORDER BY ndate DESC, ntime DESC';
        pgPool.query(text, (err, result) => {
            if (err) {
                console.log(err.code);
                console.log(err.message);

            } else {
                // no errors
                var newsEntries = [];
                for(var i = 0; i < result.rows.length; i++){
                    newsEntries.push({"title":result.rows[i].title,"text":result.rows[i].text,"date":convertDate(result.rows[i].ndate),"time":convertTime(result.rows[i].ntime)})
                }
                if(req.isAuthenticated()){
                    const text = 'SELECT type FROM users WHERE uid = $1';
                    const values = [req.user];
                    pgPool.query(text, values, (err, result) => {
                        if (err) {
                            console.log(err.code);
                            console.log(err.message);

                        } else {
                            // no errors
                            var isAdmin = false;
                            if (result.rows[0].type == "admin"){
                                isAdmin = true;
                            }
                            res.render('news', {news:newsEntries, admin:isAdmin});
                        }
                    })
                }else{
                    res.render('news', {news:newsEntries, admin:false, expandButton:false});
                }
            }
        })
    }else{
        const text = 'SELECT * FROM news ORDER BY ndate DESC, ntime DESC limit 10';
        pgPool.query(text, (err, result) => {
            if (err) {
                console.log(err.code);
                console.log(err.message);

            } else {
                // no errors
                var newsEntries = [];
                for(var i = 0; i < result.rows.length; i++){
                    newsEntries.push({"title":result.rows[i].title,"text":result.rows[i].text,"date":convertDate(result.rows[i].ndate),"time":convertTime(result.rows[i].ntime)})
                }
                if(req.isAuthenticated()){
                    const text = 'SELECT type FROM users WHERE uid = $1';
                    const values = [req.user];
                    pgPool.query(text, values, (err, result) => {
                        if (err) {
                            console.log(err.code);
                            console.log(err.message);

                        } else {
                            // no errors
                            var isAdmin = false;
                            if (result.rows[0].type == "admin"){
                                isAdmin = true;
                            }
                            res.render('news', {news:newsEntries, admin:isAdmin, expandButton:true});
                        }
                    })
                }else{
                    res.render('news', {news:newsEntries, admin:false});
                }
            }
        })
    }

});
app.get('/download', function(req, res){
    var file = req.query.file;
    if(file == 'hydroponik'){
        res.download(__dirname + '/public/downloads/hydroponik.pdf', 'hydroponik.pdf');
    }else if(file == 'wurmkiste'){
        res.download(__dirname + '/public/downloads/wurmkiste.pdf', 'wurmkiste.pdf');
    }else if(file == 'experimentezuhause'){
        res.download(__dirname + '/public/downloads/experimente.pdf', 'experimente.pdf');
    }else{
        res.render('404');
    }
});
app.get('/', function(req, res){
    res.render('landing', {layout: 'landinglayout'});
});
app.get('/home', function(req, res){
    res.render('home');
});
app.get('/login', function(req, res){
    if(req.isAuthenticated()){
        res.redirect('/home');
    }else{
        res.render('login');
    }
});
app.get('/signup', function(req, res){
    if(req.isAuthenticated()){
        res.redirect('/home');
    }else{
        res.render('signup');
    }
});
app.get('/logout', function(req,res){
    req.logout();
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/home');
    });
})

app.post('/signup', function(req,res){

    bcrypt.genSalt(10, function(err, salt){
        bcrypt.hash(req.body.password, salt, function(err, hash){
            const text = 'INSERT INTO users (uname, email, passwd, type) VALUES($1, $2, $3, $4)';
            const values = [req.body.username, req.body.email, hash, 'user'];
            pgPool.query(text, values, (err, result) => {
                if (err) {
                    console.log(err.code);
                    console.log(err.message);
                    if(err.code == 23505){
                        res.render('signup',{error: '<div class="alert alert-danger" role="alert">Es ist bereits ein Benutzer mit dieser Email registriert!</div>'})
                    }
                } else {
                    // no errors
                    res.render('signupsuccess');

                }
            })
        })
    })
})

app.post('/login', function(req,res){
    pgPool.query('SELECT * FROM users WHERE email = $1', [req.body.email], (err, result) => {
        if (err) {
            console.log(err.code);
            console.log(err.message);
        } else {
            if(result.rows.length == 0){
                res.render('login',{error: '<div class="alert alert-danger" role="alert">Dieser Benutzer existiert nicht!</div>'})
            }else{
                if(bcrypt.compareSync(req.body.password, result.rows[0].passwd)){
                    const user_id = result.rows[0].uid;
                    req.login(user_id, function(err2){
                        if(err2){
                            console.log(err2);
                        }
                        res.redirect('/home');
                    })
                }else{
                    res.render('login',{error: '<div class="alert alert-danger" role="alert">Passwort oder Benutzername ist falsch!</div>'})
                }

            }
        }
    })
})
app.post('/addnews', function(req,res){
    const text = 'INSERT INTO news (title, text, ndate, ntime) VALUES($1, $2, $3, $4);';
    const values = [req.body.title, req.body.text, getDate(), getTime()];
    pgPool.query(text, values, (err, result) => {
        if (err) {
            console.log(err.code);
            console.log(err.message);
        } else {
            // no errors
            res.redirect('news');
        }
    })
})
app.post('/addExperiment', function(req,res){
    const text = 'INSERT INTO experiment (uid,title,text,edate,etime) VALUES($1, $2, $3, $4, $5);';
    const values = [req.user, req.body.title, req.body.text, getDate(), getTime()];
    pgPool.query(text, values, (err, result) => {
        if (err) {
            console.log(err.code);
            console.log(err.message);
            res.redirect('500');
        } else {
            // no errors
            res.redirect('experimente');
        }
    })
})

app.post('/experiment', function(req,res){
    if(req.body.eid && req.body.commentText && req.user){
        pgPool.query('INSERT INTO comment (uid,eid,text,upvotes,cdate,ctime) VALUES($1, $2, $3, $4, $5, $6);', [req.user,req.body.eid, req.body.commentText,0,getDate(),getTime()], (err, result) => {
            if (err) {
                console.log(err.code);
                console.log(err.message);
                res.redirect('500');
            } else {
                // no errors
                res.redirect('/experiment?eid='+req.body.eid);
            }
        })
    }else{
        res.redirect('500');
    }

})

passport.serializeUser(function(user_id, done) {
  done(null, user_id);
});

passport.deserializeUser(function(user_id, done) {
    done(null, user_id);
});

// 404 und 500 Error screens
app.use(function(req,res){
    res.type('text/html');
    res.status(404);
    res.render('404');
})
app.use(function(err, req, res, next){
    console.error(err.stack);
    res.type('text/html');
    res.status(500);
    res.render('500');
})







app.listen(app.get('port'), function(){
    console.log('Node JS server using express started on port: ' + app.get('port') + '. Press Crtl+C to terminate.')
})
