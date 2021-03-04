const express = require('express');
const router = express.Router();
const Desk = require('../models/Desk');
const User = require('../models/User');

router.get('/', (req, res) => {
    res.redirect('/board');
});

router.get('/deskdata', async (req, res) => {
    const userData = { _id : req.session.currentUser._id, name : req.session.currentUser.name };
    let deskData = await Desk.findOne({ _id: req.session.currentDesk }).select('-date');
    const admin = await User.findOne({_id: deskData.admin})
        .select('-password -sessionid -invites -desks -sharedDesks');
    
    let members = [];
    if(deskData.members.length > 0){
        members = await User.find().where('_id').in(deskData.members)
            .select('-password -sessionid -invites -desks -sharedDesks').exec();
    };
    deskData = deskData.toObject();
    delete deskData.members;
    delete deskData.admin;

    const fullDeskData = {
        user : userData,
        desk : deskData,
        admin : admin,
        members : members
    };
    res.status(200).end(JSON.stringify(fullDeskData));
});

router.use('/', express.static('static'));

router.get('/:deskID', (req, res) => {
    if(!req.cookies._taskID) res.redirect('/login')
    else{
        let desk;
        desk = req.session.currentUser.desks.find( desk => {
            return desk == req.params.deskID;
        });
        if(desk == undefined){
            desk = req.session.currentUser.sharedDesks.find( shared => {
                return shared == req.params.deskID;
            });    
        };   
        if(desk == undefined){
            res.redirect('/board');
        }
        else{
            req.session.currentDesk = desk;
            res.sendFile('desk.html', {root:'static'});
        }
    };
});

router.patch('/deskname', async (req, res) => {
    const updatedDesk = await Desk.findOneAndUpdate({_id : req.session.currentDesk}, { $set: {name: req.body.deskname}}, {new: true}).select('name');
    res.end(JSON.stringify(updatedDesk.name));
});

router.delete('/leave/:userID/:deskID', async (req, res) => {
    const updatedUser = await User.findOneAndUpdate({_id: req.session.currentUser._id}, {$pull: {sharedDesks: req.params.deskID}}, {new: true}).select('-password');
    await Desk.updateOne({_id: req.params.deskID}, {$pull: {members: req.params.userID}});
    req.session.currentUser = updatedUser;
    res.end(JSON.stringify(true));
});

module.exports = router;