var Matches = new Mongo.Collection('matches');

Meteor.publish('userData', function () {
  if (this.userId) {
    return Meteor.users.find({_id: this.userId},
                             {fields: {'services': 1}});
  } else {
    this.ready();
  }
});

Meteor.publishComposite('userMatches', {
  find: function () {
    return Matches.find({$or: [{userAId: this.userId}, {userBId: this.userId}]}, {sort: {createdAt: -1}});
  },
  children: [{
    find: function (match) {
      var otherUserId = match.userAId === this.userId ? match.userBId : match.userAId;
      return Meteor.users.find({_id: otherUserId});
    }
  }]
});

SyncedCron.add({
  name: 'Match and update',
  schedule: function(parser) {
    // parser is a later.parse object
    return parser.text('every 1 day');
  },
  job: function() {
    createMatches();
    updateAvailability();
  }
});


function updateAvailability() {
  Meteor.users.find({'profile.frequency': 0}).forEach((user) => {
    Meteor.users.update({_id: user._id}, {$set: {'profile.available': false}});
  });

  Meteor.users.find({'profile.frequency': {$gt: 0}}).forEach((user) => {
    var lastMatch = Matches.find(
      {$or: [{userAId: user._id}, {userBId: user._id}]},
      {
        sort: {createdAt: -1},
        limit: 1
      }).fetch()[0];
    var availability = true;
    if (lastMatch) {
      var millisecondsSinceMatchMade = (new Date()) - lastMatch.createdAt;
      console.log(lastMatch);
      var userFrequencyInMilliseconds = user.profile.frequency * 60 * 60 * 24 * 1000;
      availability = millisecondsSinceMatchMade > userFrequencyInMilliseconds;
    }
    console.log(`${user.profile.name} has availability ${availability}: ${millisecondsSinceMatchMade} ${userFrequencyInMilliseconds}`);
    Meteor.users.update(
      {_id: user._id}, {$set: {'profile.available': availability}});
  });
}

function createMatches() {
  console.log('running create matches');
  // in the future do a random sort
  var availableUsers = _.shuffle(Meteor.users.find({'profile.available': true}).fetch());
  console.log(availableUsers.length);
  for (var i = 0; i <= (availableUsers.length - 2); i += 2) {
    var currentTime = Date.now();
    console.log('creating match for i = ' + i);
    var userA = Meteor.users.findOne(availableUsers[i]._id);
    var userB = Meteor.users.findOne(availableUsers[i + 1]._id);
    console.log(
      `match between ${userA.profile.name} and ${userB.profile.name} made!`);
    Matches.insert({
      userAId: userA._id,
      userBId: userB._id,
      createdAt: currentTime,
      met: false,
      updatedAt: currentTime
    });

    // send match email

    Email.send({
      from: 'irvin@skillshare.com',
      to: [userA.profile.email, userB.profile.email],
      subject: `You've been matched!`,
      text: `
      Hello ${userA.profile.name} and ${userB.profile.name}!
        Feel free to schedule a time to meet up!
      `
    });
  }


}

SyncedCron.start();
