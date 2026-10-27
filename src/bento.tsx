import React from 'react';
import {AppRegistry} from 'react-native';
import {YouTubePremiumCard} from './YouTubePremiumCard';

// Only the YouTube Premium tile is live — it's the React Native component (Spotlight iteration).
function YT() { return <YouTubePremiumCard variant="spotlight" />; }
AppRegistry.registerComponent('yt', () => YT);
AppRegistry.runApplication('yt', {rootTag: document.getElementById('yt')});
