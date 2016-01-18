var Matches = new Mongo.Collection('matches');

Meteor.subscribe('userData');
Meteor.subscribe('userMatches');

Template.body.helpers({
  isAdmin: () => {
    return Meteor.user().services && (Meteor.user().services.google.email === 'irvin@skillshare.com');
  }
});

Template.adminControls.events({
  'click .run-matches': (event) => {
    Meteor.call('runMatches', (error, result) => {
      if (error) {
        console.error('problem running matches: ' + JSON.stringify(error));
      } else {
        console.log('Run matches completed with ' + JSON.stringify(result) + ' matches made.');
      }
    });
  },
  'click .update-availability': (event) => {
    Meteor.call('updateAvailability', (error, result) => {
      if (error) {
        console.error('problem updating availability: ' + JSON.stringify(error));
      } else {
        console.log('Updated availability with ' + JSON.stringify(result) + ' available users.');
      }
    });
  }
});

Template.userInfo.helpers({
  user: () => {
    if (Meteor.user().services) {
      return Meteor.user().services.google;
    }
  }
});

Template.frequencyForm.helpers({
  frequencyOptions: () => {
    var options = [{
      value: 0,
      text: 'not now'
    }, {
      value: 7,
      text: 'weekly'
    }, {
      value: 14,
      text: 'once every two weeks'
    }, {
      value: 21,
      text: 'once every three weeks'
    }, {
      value: 28,
      text: 'once every four weeks'
    }];

    // set which one is selected
    _.each(options, (option) => {
      option.selected = option.value === Number(Meteor.user().profile.frequency) ? 'selected' : '';
    });

    return options;
  }
});

Template.frequencyForm.events({
  'change .frequency-form' : (event) => {
    console.log(event);
    Meteor.users.update({
      _id: Meteor.user()._id
    }, {
      $set: {'profile.frequency': Number($(event.target).val())}
    });
  }
});

Template.matches.helpers({
  matches: () => {
    // b/c of the subscription the only matches are ones the user is a part of
    var userMatches =  Matches.find().fetch();
    _.each(userMatches, (match) => {
      var otherUserId = match.userAId === Meteor.userId() ? match.userBId : match.userAId;
      match.otherUser = Meteor.users.findOne(otherUserId);
      if (match.otherUser) {
        match.otherUser = match.otherUser.services.google;
      }
    });
    return userMatches;
  },
  matchedUser: () => {
    var userA = Meteor.users.findOne(this.userAId);
    var userB = Meteor.users.findOne(this.userBId);
    var otherUserId = (Meteor.userId() === this.userAId ? this.userBId : this.userAId);
    return Meteor.users.findOne(otherUserId);
  },
  readableDate: (createdAt) => {
    console.log(createdAt);
    console.log((new Date(createdAt)).toString());
    return moment((new Date(createdAt))).format("dddd, MMMM Do YYYY");
  }

});
