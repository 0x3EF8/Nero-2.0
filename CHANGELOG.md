<<<<<<< HEAD
# Hexabot Changelog
## [Unreleased]

### Added
- New ASCII art banner for Hexabot startup
=======
# Nero 2.0 Changelog
## [Unreleased]

### Added
- New ASCII art banner for Nero 2.0 startup
>>>>>>> 660112f (Initial commit with updated code)
- Terminal clearing function for a clean startup display
- Improved file structure for better organization and scalability

### Change
- Updated the project structure

### Improved
- Enhanced the startup banner with custom coloring and formatting

## [1.0.0] - 2024-10-05
### Added
<<<<<<< HEAD
- Initial release of Hexabot
=======
- Initial release of Nero 2.0
>>>>>>> 660112f (Initial commit with updated code)
- Basic Facebook Messenger bot functionality
- Command handling system
- Event listener for message processing
- Configuration files for bot settings and user roles
- Integration with fca-unofficial library for Facebook API interactions


## File Structure Updates

```
<<<<<<< HEAD
Hexabot
=======
Nero 2.0
>>>>>>> 660112f (Initial commit with updated code)
│
├── CHANGELOG.md
├── LICENSE
├── docs
│   ├── API.md
│   ├── CONTRIBUTING.md
│   └── README.md
├── error.log
├── index.js
├── package-lock.json
├── package.json
├── public
│   └── images
├── scripts
│   └── installer.js
├── server.js
├── src
│   ├── api
│   │   └── fbstateApi.js
│   ├── commands
│   │   ├── admin.js
│   │   ├── ai.js
│   │   ├── clearcache.js
│   │   ├── cmd.js
│   │   ├── config.js
│   │   ├── group.js
│   │   ├── kick.js
│   │   ├── leave.js
│   │   ├── msgdev.js
│   │   ├── mute.js
│   │   ├── periodic.js
│   │   ├── restart.js
│   │   ├── settings.js
│   │   ├── shell.js
│   │   ├── thread.js
│   │   ├── uid.js
│   │   ├── unsend.js
│   │   ├── uptime.js
│   │   ├── userlist.js
│   │   └── vip.js
│   ├── config
│   │   ├── api_config.json
│   │   ├── cookies
│   │   ├── restricted_access.json
│   │   ├── roles.json
│   │   └── settings.json
│   ├── events
│   │   ├── antileave.js
│   │   ├── botdetector.js
│   │   └── handleReact.js
│   └── lib
│       └── fca-unofficial
│           ├── CHANGELOG.md
│           ├── DOCS.md
│           ├── LICENSE-MIT
│           ├── README.md
│           ├── index.js
│           ├── package-lock.json
│           ├── package.json
│           ├── src
│           │   ├── addExternalModule.js
│           │   ├── addUserToGroup.js
│           │   ├── changeAdminStatus.js
│           │   ├── changeArchivedStatus.js
│           │   ├── changeBio.js
│           │   ├── changeBlockedStatus.js
│           │   ├── changeGroupImage.js
│           │   ├── changeNickname.js
│           │   ├── changeThreadColor.js
│           │   ├── changeThreadEmoji.js
│           │   ├── createNewGroup.js
│           │   ├── createPoll.js
│           │   ├── deleteMessage.js
│           │   ├── deleteThread.js
│           │   ├── editMessage.js
│           │   ├── forwardAttachment.js
│           │   ├── getCurrentUserID.js
│           │   ├── getEmojiUrl.js
│           │   ├── getFriendsList.js
│           │   ├── getThreadHistory.js
│           │   ├── getThreadHistoryDeprecated.js
│           │   ├── getThreadInfo.js
│           │   ├── getThreadInfoDeprecated.js
│           │   ├── getThreadList.js
│           │   ├── getThreadListDeprecated.js
│           │   ├── getThreadPictures.js
│           │   ├── getUserID.js
│           │   ├── getUserInfo.js
│           │   ├── handleFriendRequest.js
│           │   ├── handleMessageRequest.js
│           │   ├── httpGet.js
│           │   ├── httpPost.js
│           │   ├── listenMqtt.js
│           │   ├── logout.js
│           │   ├── markAsDelivered.js
│           │   ├── markAsRead.js
│           │   ├── markAsReadAll.js
│           │   ├── markAsSeen.js
│           │   ├── muteThread.js
│           │   ├── removeUserFromGroup.js
│           │   ├── resolvePhotoUrl.js
│           │   ├── searchForThread.js
│           │   ├── sendMessage.js
│           │   ├── sendTypingIndicator.js
│           │   ├── setMessageReaction.js
│           │   ├── setPostReaction.js
│           │   ├── setTitle.js
│           │   ├── threadColors.js
│           │   ├── unfriend.js
│           │   └── unsendMessage.js
│           ├── test
│           │   ├── data
│           │   │   ├── shareAttach.js
│           │   │   ├── something.mov
│           │   │   ├── test.png
│           │   │   └── test.txt
│           │   ├── example-config.json
│           │   ├── test-page.js
│           │   └── test.js
│           └── utils.js
└── views
    ├── appstateget.ejs
    └── index.ejs
    ```