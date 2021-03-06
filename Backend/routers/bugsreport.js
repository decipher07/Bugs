const express = require('express')
const router = express.Router();
const Bugs = require('../models/BugsModel');
const User = require('../models/User-Google')
const Label = require('../models/Labels')
const {spawn} = require('child_process');
const {ensureAuthenticated} = require('../config/auth');
const { json } = require('body-parser');
const fetch = require('node-fetch');

// Importing Middlewares
const auth = require('../middlewares/auth')
const adminauth = require('../middlewares/admin-auth')

// Router Allowing Admin To Change the Public Visibility of the Application
router.patch('/changestatus', adminauth, async (req, res) => {
    var {project,isPublic} = req.body;
    try {
        const bugs = await Bugs.updateOne({project},{$set: {"isPublic": isPublic}})
        console.log(bugs)
        res.json(await Bugs.findOne({project}))
    } catch (e) {
        console.log(e);
        res.json(e);
    }
})

// Router for Syncing Github Repo with Web App
router.get('/syncrepo', auth,  async(req, res) => {
    try {
        const bugs = await Bugs.find({})
        var projectarray = []
        const user = 'CodeChefVIT';
        // repo = repo.replace(/ /g, '-')
        console.log(`https://api.github.com/orgs/${user}/repos?per_page=1000`)  
        fetch(`https://api.github.com/orgs/${user}/repos?per_page=1000`, {
            method: 'get', 
            headers: {'Content-Type': 'application/json', 'Authorization': `token ${process.env.TOKEN}`}
        })
        .then( (res) => {
            return res.json();
        })
        .then( (json) => {
            // console.log(json);

            bugs.forEach((bug) => {
                // console.log(bug.project)`
                projectarray.push(bug.project)
            })

            json.forEach(async (element) => {
                // console.log(element.name)
                if (!projectarray.includes(element.name)){
                    const bugs = new Bugs({project: element.name})
                    await bugs.save();
                }
            })
        })
        res.json(bugs)
    }catch (e){
        console.log(e);
        res.json(e);
    }    
})

// Router For Posting The Labels for CC Projects --> Specifically For CC Members 
router.post('/addlabels', auth,adminauth ,async(req, res) => {
    var label = req.body.label 
    const exist = await Label.findOne({label})
    if (exist){
        console.log(`An Label Already Exists `)
        res.json('An Label Already Exists ')
    } else {
        const newLabel = new Label({label})
        await newLabel.save()
        res.json(newLabel)
    }
})

// Router For Outputting the Labels Available 
router.get('/getlabels', auth,async(req, res) => {   
    const labels = await Label.find({})
    console.log(labels)
    res.json(labels)    
})

// Router For Posting The Project --> Specifically For CC Members
router.post('/addprojectcodechef', auth, adminauth,async (req, res) => {
    var project = req.body.project
    const bugs = await Bugs.findOne({project})
    console.log(bugs)
    if (bugs){
        res.json("The Project Already Exists !!! ")
    } else {
        const update = new Bugs({project})
        await update.save()
        res.json(update)
    }
})

// Getting All the Projects 
router.get('/allprojects', auth,async (req, res) => {
    const bugs = await Bugs.find({})
    console.log(bugs)  
    project = [] 
    bugs.forEach((bug) => {
        project.push(bug.project)
    })  
    res.json(project) 
})

// Get all Bug Issue Ids for a Specific Project, Will Help in Frontend for Updation using Ids 
router.get('/issueid/:id', auth,async (req, res) => {
    var id = req.params.id 
    const bugs = await Bugs.find({_id: id})
    issues = []
    bugs.forEach((bug) => { 
        console.log(bug.alpha)
        bug.alpha.forEach((scrap) => {
            issues.push(scrap._id)
        })
    }) 
    res.json(issues)
}) 

// Finding Issues in Particular Project with Certain Ids 
router.get('/bug/:id', auth,async(req, res) => { 
    var project = req.params.id ;
    
    if (project == 'all'){
        const report = await Bugs.find({})
        res.json(report)
    }
    try {
        const report = await Bugs.findOne({
            project
        })
        if (report){
            console.log(report)
            res.json(report)
        }
    } catch(e){
        console.log(e);
        res.json(e)
    }
})

// Posting The Bugs 
router.post('/reportbug', auth,async (req, res) => {
    console.log(req.body)
    var project = req.body.project
    var title = req.body.title
    var description = req.body.description
    var issuedby = req.body.issuedby
    var gitLabels = req.body.labels
    var template = {
        title,
        description,
        issuedby,
        gitLabels
    }
    try {
        const bug = await Bugs.findOne({
            project
        })

        if (!bug) {
            const bugs = new Bugs({
                project,
            })
            bugs.alpha.push(template)
            await bugs.save();
            res.json(bugs)
        } else {
            bug.alpha.push(template)
            await bug.save();
            res.json(bug)
        }

        var gitIssue = [];
        var gitTemplate = {title, body: description}
        gitIssue.push((gitTemplate))
        console.log(gitTemplate)
        
        const user = 'CodeChefVIT';
        var repo = project;
        repo = repo.replace(/ /g, '-')
        console.log(`https://api.github.com/repos/${user}/${repo}/issues`)
        gitIssue.forEach(issue => {
            fetch(`https://api.github.com/repos/${user}/${repo}/issues`, {
                method: 'post',
                body:    JSON.stringify(issue),
                headers: {'Content-Type': 'application/json', 'Authorization': `token ${process.env.TOKEN}`}
            })
            .then(res =>  res.json())
            .then(json => {
                console.log(`Issue created at ${json.url}`)
            })
        })


    } catch (e) {
        console.log(e)
    }
})

// Updation of Bug by User
router.patch('/updatebug/:id', auth,async (req, res) => {
    
    var id = req.params.id 
    
    try {
        const bug = await Bugs.findOne({ "alpha._id": id})
        const {title, description} = req.body
        if (bug){
            // console.log(bug.alpha[0]._id)
            const ans = await bug.alpha
            var t = 0 ;

            for(var i = 0 ; i < ans.length ; i++ ){
                if (ans[i]._id == id){
                    if (title)
                        ans[i].title = title 
                    if (description)
                        ans[i].description = description
                    t = i ;
                }
            }
            bug.alpha[t] = ans[t];
            await bug.save() 
            res.json(bug.alpha[t])        
        }else {
            res.json("Not Found")
        }
    }catch (e){
        res.json(e)
        console.log(e)
    }
})

// Deletion By User 
router.delete('/deletebug/:id', auth,async(req, res) => {
    var id = req.params.id 
    var issuenumber = 0 ;
    try {
        const bug = await Bugs.findOne({ "alpha._id": id})
        if (bug){
            const ans = await bug.alpha
            var filtered = ans.filter(async function(value, index, arr){ 
                if (value._id == id){
                    const user = 'CodeChefVIT';
                    var repo = bug.project;
                    repo = repo.replace(/ /g, '-')
                    console.log(`https://api.github.com/repos/${user}/${repo}/issues`) 
                    fetch(`https://api.github.com/repos/${user}/${repo}/issues`, {
                        method: 'get',
                        headers: {"Authorization": `token ${process.env.TOKEN}`}
                    })
                    .then( (res) => {
                        return res.json();
                    })
                    .then( (json) => {
                        // console.log(json)
                        json.forEach((element) => {
                            console.log(element.number + element.title)
                            if (element.title == value.title){
                                issuenumber = element.number
                                checktemp = {'state':'closed'}
                                fetch(`https://api.github.com/repos/${user}/${repo}/issues/${issuenumber}`,{method: 'patch', body: JSON.stringify(checktemp),headers: {"Authorization": `token ${process.env.TOKEN}` }})
                                .then( (res1) => { return res1.json() })
                                .then( (json1) => { console.log(json1)})
                            }
                        })
                        // console.log(value)
                    })
                }
                return (value._id != id)})
                bug.alpha = filtered
                // console.log(issuenumber)  
                await bug.save()
                res.json(bug.alpha) 
                // console.log(filtered)
        }else {
            res.json("Not Found")
        }  
    }catch (err){
        console.log(err)
        res.json(err)
    }
})


/*
*

                    // console.log(value)
                    const user = 'CodeChefVIT';
                    var repo = bug.project;
                    repo = repo.replace(/ /g, '-')
                    console.log(`https://api.github.com/repos/${user}/${repo}/issues`)
                    const ji = fetch(`https://api.github.com/repos/${user}/${repo}/issues`, {method: 'get', headers: {'Content-Type': 'application/json', 'Authorization': `token ${process.env.TOKEN}`}}).then((res) => {res.json()}).then((soe) => console.log('Hello World'))
                    //     gitIssue.forEach(issue => {
                //         fetch(`https://api.github.com/repos/${user}/${repo}/issues`, {
                //         method: 'get',
                //         headers: {'Content-Type': 'application/json', 'Authorization': `token ${process.env.TOKEN}`}
                //     })
                //     .then(res =>  res.json())
                //     .then(json => {
                //         console.log(`Issue created at ${json.url}`)
                //     })
                // })
                    console.log(ji) */


// Posting Comments by CC Authorities 
router.patch('/postcomment/:id', adminauth,async (req, res) => {
    var id = req.params.id  
    const {comments} = req.body
    
    // Temp Setup --> Start 
    // const user = await User.findOne({_id: "5f05c368e20877d6d7fc7015"})
    // req.user = user  
    // Temp Setup --> End 
    
    console.log(req.user.isCodechef) 
    if (req.user.isCodechef){
        try {
        
            const update = await Bugs.findOne({"alpha._id": id })
            
            const ans = await update.alpha
            var t = 0 ;
    
            for(var i = 0 ; i < ans.length ; i++ ){
                if (ans[i]._id == id){
                    ans[i].answer = comments
                    ans[i].issueSorted = true 
                    t = i ;
                }
            }
            update.alpha[t] = ans[t];
            await update.save() 
            res.json(update.alpha[t]) 
        }catch (err){
            console.log(err)
            res.json(err)
        }
    } else {
        res.json("Not Authorized")
    }
})

// Posting Comments By Authors as well as CC Members 
router.patch('/addcommentsbyusers/:id', auth,async (req, res) => {
    
    var id = req.params.id ;
    const {userComments, issuedby} = req.body ;

    var modeltemplate = {discussions: userComments, name: issuedby}

    try {
        const update = await Bugs.findOne({"alpha._id": id });
        const ans = await update.alpha
        var t = 0 ;
        for (var i = 0 ; i < ans.length ; i++ ){
            if (ans[i]._id == id){
                ans[i].commentsByUsers.push(modeltemplate)
                t = i ;
                break ;
            }
        }
        await update.save()
        res.send(ans[t])

    } catch (err) {
        console.log(err);
        res.json(err);
    }

})

// Get Route for Comments 5f231bbe79e9bfc3c3f796e4
router.get('/getcommentsbyusers/:id', auth,async(req, res) => {
    var id = req.params.id ;
    try {
        const project = await Bugs.findOne({"alpha._id": id });
        res.send(project.alpha);
        console.log(project.alpha)
    }catch(e){
        res.json(e);
    }
})

// Editing The Comment Under Discussion Tab 
router.patch('/editcommentsbyusers/:id', auth,async(req, res) => {
    var id = req.params.id ;
    const {editComments} = req.body ;

    try {
        const update = await Bugs.findOne({"alpha.commentsByUsers._id" : id })
        const ans = await update.alpha
        var t = 0 ;
        var l = 0 ;

        for(var i = 0 ; i < ans.length ; i++ ){
            var changes = ans[i].commentsByUsers;
            for (var j = 0 ; j < changes.length ; j++ ){
                if (changes[j]._id == id){
                    if (editComments){
                        changes[j].discussions = editComments;
                        t = j ;
                        l = i ;
                    }
                    break ;
                }
            }
        }

        await update.save();

        res.send(update)

    } catch (err){
        console.log(err);
        res.send(err);
    }
})

// Deleting the Route for Discussion Comments
router.delete('/deletecommentsbyusers/:id', auth,async (req, res) => {
    var id = req.params.id ;
    try {
        const update = await Bugs.findOne({"alpha.commentsByUsers._id" : id })
        if (update){
            const ans = await update.alpha 
            var t = 0 
            var l = 0 

            var changes = 0 ;
            for (var i = 0 ; i < ans.length ; i++){
                changes = ans[i].commentsByUsers;
                for (var j = 0 ; j < changes.length ; j++ ){
                    var filtered = changes.filter(function(value, index, arr){ return value._id != id;});
                }
                changes = filtered
                ans[i].commentsByUsers= filtered;
                t = i ;
            }

            await update.save()

        

            console.log(changes)
            res.send(update.alpha[t].commentsByUsers)
        } else {
            res.send("Not Found !!! ")
        }

    } catch (err){
        console.log(err);
        res.send(err);
    }
})


module.exports = router