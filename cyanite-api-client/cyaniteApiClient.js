import fetch from 'node-fetch';
import promptSync from 'prompt-sync';
import fs from 'fs';
const API_URL = 'https://api.cyanite.ai/graphql';
const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiSW50ZWdyYXRpb25BY2Nlc3NUb2tlbiIsInZlcnNpb24iOiIxLjAiLCJpbnRlZ3JhdGlvbklkIjoxMTU2LCJ1c2VySWQiOjEyMDc5MiwiYWNjZXNzVG9rZW5TZWNyZXQiOiIzZWE0M2E4ZmQ0ZTFhNGQyMjViNTEyNjAyMDA1ZDg1YThkOTYwNzM1YjMzNGUyMTcxNzk5YmE1YWQwNjgyMzA4IiwiaWF0IjoxNzIyMzQ2NzA4fQ.BKueANLFIBidIijpjrLP4Q59lAOHyYcjwcX02eU6SUs';
const prompt = promptSync();

const fetchSongIdsQuery = `
  query {
    libraryTracks(first: 10) {
      edges {
        node {
          id
        }
      }
    }
  }
`;
const fetchMoodQuery = `
  query LibraryTrackQuery($libraryTrackId: ID!) {
    libraryTrack(id: $libraryTrackId) {
      __typename
      ... on LibraryTrackNotFoundError {
        message
      }
      ... on LibraryTrack {
        id
        title
        audioAnalysisV6 {
          __typename
          ... on AudioAnalysisV6Finished {
            result {
              segments {
                representativeSegmentIndex
                timestamps
                mood {
                  aggressive
                  calm
                  chilled
                  dark
                  energetic
                  epic
                  happy
                  romantic
                  sad
                  scary
                  sexy
                  ethereal
                  uplifting
                }
                voice {
                  female
                  instrumental
                  male
                }
                instruments {
                  percussion
                  synth
                  piano
                  acousticGuitar
                  electricGuitar
                  strings
                  bass
                  bassGuitar
                  brassWoodwinds
                }
                genre {
                  ambient
                  blues
                  classical
                  electronicDance
                  folkCountry
                  funkSoul
                  jazz
                  latin
                  metal
                  pop
                  rapHipHop
                  reggae
                  rnb
                  rock
                  singerSongwriter
                }
                subgenre {
                  bluesRock
                  folkRock
                  hardRock
                  indieAlternative
                  psychedelicProgressiveRock
                  punk
                  rockAndRoll
                  popSoftRock
                }
                valence
                arousal
                moodAdvanced {
                  aggressive
                  calm
                  cheerful
                  dark
                  energetic
                  epic
                  happy
                  romantic
                  sad
                  scary
                  sexy
                  uplifting
                }
                movement {
                  bouncy
                  driving
                  flowing
                  groovy
                  nonrhythmic
                  pulsing
                  robotic
                  running
                  steady
                  stomping
                }
                character {
                  bold
                  cool
                  epic
                  ethereal
                  heroic
                  luxurious
                  magical
                  mysterious
                  playful
                  powerful
                  retro
                  sophisticated
                  sparkling
                  sparse
                  unpolished
                  warm
                }
                classicalEpoch {
                  middleAge
                  renaissance
                  baroque
                  classical
                  romantic
                  contemporary
                }
              }
            }
          }
        }
      }
    }
  }
`;

const fetchSongIds = async () => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query: fetchSongIdsQuery }),
  });

  if (!response.ok) {
    console.error('Error fetching song IDs:', response.statusText);
    return;
  }

  const data = await response.json();
  if (data.errors) {
    console.error('GraphQL Errors:', data.errors);
    return;
  }

  return data.data.libraryTracks.edges.map(edge => edge.node.id);
};


const fetchMoodData = async (id) => {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        query: fetchMoodQuery,
        variables: { libraryTrackId: id },
      }),
    });
  
    if (!response.ok) {
      console.error('Error fetching mood data:', response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }
  
    const data = await response.json();
    if (data.errors) {
        console.error('GraphQL Errors:', JSON.stringify(data.errors, null, 2));
        return;
      }
    
      console.log('Full API Response:', JSON.stringify(data, null, 2));
    
      return data.data?.libraryTrack;
  
   
  };

 
 
  const displayMoodData = (trackData) => {
    if (trackData.__typename === 'LibraryTrackNotFoundError') {
      console.log('Error:', trackData.message);
      return;
    }
  
    if (trackData.__typename === 'LibraryTrack') {
      console.log(`Track Title: ${trackData.title}`);
      
      if (trackData.audioAnalysisV6.__typename === 'AudioAnalysisV6Finished') {
        const segments = trackData.audioAnalysisV6.result.segments;
        
        console.log('Segments data structure:');
        console.log(JSON.stringify(segments, null, 2));
  
        if (Array.isArray(segments)) {
          const targetTime = 4; // 4 seconds
          
          // Find the segment closest to 4 seconds
          const closestSegment = segments.reduce((prev, curr) => 
            Math.abs(curr.timestamps[0] - targetTime) < Math.abs(prev.timestamps[0] - targetTime) ? curr : prev
          );
          
          console.log(`Audio Analysis at approximately ${closestSegment.timestamps[0].toFixed(2)} seconds:`);
          displaySegmentData(closestSegment);
        } else if (typeof segments === 'object' && segments !== null) {
          console.log('Audio Analysis:');
          displaySegmentData(segments);
        } else {
          console.log('Unexpected segments data structure');
        }
      } else {
        console.log('Audio analysis not finished or not available.');
      }
    }
  };
  
  const displaySegmentData = (segment) => {
    Object.entries(segment).forEach(([category, data]) => {
      if (typeof data === 'object' && data !== null && category !== 'timestamps') {
        console.log(`  ${category.charAt(0).toUpperCase() + category.slice(1)}:`);
        Object.entries(data).forEach(([key, value]) => {
          if (typeof value === 'number') {
            console.log(`    ${key}: ${value.toFixed(2)}`);
          }
        });
      } else if (Array.isArray(data) && category !== 'timestamps') {
        console.log(`  ${category.charAt(0).toUpperCase() + category.slice(1)}: ${data.map(v => v.toFixed(2)).join(', ')}`);
      } else if (typeof data === 'number') {
        console.log(`  ${category}: ${data.toFixed(2)}`);
      }
    });
  };

  const displayAndSaveGraphData = (trackData) => {
    if (trackData.__typename === 'LibraryTrackNotFoundError') {
      console.log('Error:', trackData.message);
      return;
    }
  
    if (trackData.__typename === 'LibraryTrack') {
      console.log(`Track Title: ${trackData.title}`);
      
      if (trackData.audioAnalysisV6.__typename === 'AudioAnalysisV6Finished') {
        const segments = trackData.audioAnalysisV6.result.segments;
        
        let csvContent = 'Time,Aggressive,Calm,Chilled,Dark,Energetic,Epic,Happy,Romantic,Sad,Scary,Sexy,Ethereal,Uplifting\n';
        
        console.log('Graph Data:');
        console.log(csvContent.trim());
        
        segments.timestamps.forEach((timestamp, index) => {
          const moodValues = Object.values(segments.mood).map(arr => arr[index].toFixed(2));
          const row = `${timestamp},${moodValues.join(',')}`;
          csvContent += row + '\n';
          console.log(row);
        });
  
        csvContent += '\nTime,Valence,Arousal\n';
        console.log('\nAdditional Data:');
        console.log('Time,Valence,Arousal');
        
        segments.timestamps.forEach((timestamp, index) => {
          const row = `${timestamp},${segments.valence[index].toFixed(2)},${segments.arousal[index].toFixed(2)}`;
          csvContent += row + '\n';
          console.log(row);
        });
  
        // Save to CSV file
        fs.writeFileSync(`${trackData.title.replace(/\s+/g, '_')}_mood_data.csv`, csvContent);
        console.log(`\nData saved to ${trackData.title.replace(/\s+/g, '_')}_mood_data.csv`);
      } else {
        console.log('Audio analysis not finished or not available.');
      }
    }
  };
  
  const main = async () => {
    const songIds = await fetchSongIds();
    if (!songIds || songIds.length === 0) {
      console.log('No song IDs available.');
      return;
    }
  
    console.log('Available Song IDs:');
    songIds.forEach((id, index) => console.log(`${index + 1}. ${id}`));
  
    const choice = prompt('Enter the number of the song ID you want to choose: ');
    const selectedId = songIds[parseInt(choice) - 1];
  
    if (!selectedId) {
      console.log('Invalid choice.');
      return;
    }
  
    const trackData = await fetchMoodData(selectedId);
    if (trackData) {
      console.log(`Mood data for track ID ${selectedId}:`);
      displayAndSaveGraphData(trackData);
    } else {
      console.log(`No information found for track ID ${selectedId}.`);
    }
  };
  
  main().catch((error) => console.error('Error:', error));