var Matches = new Mongo.Collection('matches');

Accounts.validateNewUser(function (user) {
  if (/@skillshare.com\s*$/.test(user.services.google.email)) {
    return true;
  } else {
    throw new Meteor.Error(403, "You must be logged into Google with your Skillshare account.");
  }
});

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

Meteor.methods({
  runMatches: () => {
    if (isAdmin()) {
      console.log('running matches');
      updateAvailability();
      return createMatches();
    } else {
      console.log('a non-admin attempted to run the matches');
      throw new Meteor.Error(403, 'a non-admin attempted to run the matches');
    }
  },
  updateAvailability: () => {
    if (isAdmin()) {
      return updateAvailability();
    } else {
      console.log('a non-admin attempted to update the availability');
      throw new Meteor.Error(403, 'a non-admin attempted to update the availability');
    }
  }
});

SyncedCron.add({
  name: 'Match and update',
  schedule: function(parser) {
    // parser is a later.parse object
    return parser.text('every 10 minutes');
  },
  job: function() {
    updateAvailability();
    createMatches();
  }
});

function isAdmin() {
  return Meteor.user().services.google.email === 'irvin@skillshare.com';
}

function updateAvailability() {
  var availableUserCount = 0;
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
      var userFrequencyInMilliseconds = (user.profile.frequency * 24 * 60 * 60 * 1000) - (24 * 60 * 60 * 1000);
      availability = millisecondsSinceMatchMade > userFrequencyInMilliseconds;
    }
    console.log(`${user.profile.name} has availability ${availability}: ${millisecondsSinceMatchMade} ${userFrequencyInMilliseconds}`);
    Meteor.users.update(
      {_id: user._id}, {$set: {'profile.available': availability}});
    if (availability) {
      availableUserCount += 1;
    }
  });

  return availableUserCount;
}

function createMatches() {
  console.log('running create matches');
  // in the future do a random sort
  var availableUsers = _.shuffle(Meteor.users.find({'profile.available': true}).fetch());
  var matchCount = 0;
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
    matchCount += 1;
    // send match email

    Email.send({
      from: 'irvin@skillshare.com',
      to: [userA.services.google.email, userB.services.google.email],
      subject: `Meet Skillshare`,
      text: `
      Hello ${userA.services.google.given_name} (${userA.services.google.email}) and ${userB.services.google.given_name} (${userB.services.google.email}),

      Schedule a time to meet up this week!
      `
    });
  }
  return matchCount;

}

//SyncedCron.start();
