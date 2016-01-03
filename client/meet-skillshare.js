var Matches = new Mongo.Collection('matches');

Meteor.subscribe('userData');
Meteor.subscribe('userMatches');

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
      text: 'never'
    }, {
      value: 1,
      text: 'daily'
    }, {
      value: 7,
      text: 'weekly'
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

Template.pastMatches.helpers({
  matches: () => {
    // b/c of the subscription the only matches are ones the user is a part of
    var userMatches =  Matches.find().fetch();
    _.each(userMatches, (match) => {
      var otherUserId = match.userAId === Meteor.userId() ? match.userBId : match.userAId;
      match.otherUser = Meteor.users.findOne(otherUserId).services.google;
    });
    return userMatches;
  },
  matchedUser: () => {
    var userA = Meteor.users.findOne(this.userAId);
    var userB = Meteor.users.findOne(this.userBId);
    var otherUserId = (Meteor.userId() === this.userAId ? this.userBId : this.userAId);
    console.log('this user user is ' + Meteor.userId());
    console.log('the other user is ' + otherUserId);
    console.log('a user is ' + this.userAId);
    console.log('b user is ' + this.userBId);
    return Meteor.users.findOne(otherUserId);
  }
});
