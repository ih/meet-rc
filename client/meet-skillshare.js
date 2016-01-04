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
      value: 3,
      text: '~2 times a week'
    }, {
      value: 7,
      text: 'weekly'
    }, {
      value: 14,
      text: 'once every two weeks'
    }, {
      value: 30,
      text: '~once a month'
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
  createdAt: () => {
    return (new Date(this.createdAt)).toString();
  }

});
