import fs from 'fs';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
//npm install chartjs-node-canvas --legacy-peer-deps

const width = 800;
const height = 600;
const chartCallback = (ChartJS) => {
    ChartJS.defaults.responsive = true;
    ChartJS.defaults.maintainAspectRatio = false;
};
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });

const generateGraph = async (csvFilePath) => {
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    const rows = csvData.split('\n');
    const headers = rows[0].split(',');
    
    // Find the index where the second section starts
    const secondSectionIndex = rows.findIndex(row => row.startsWith('Time,Valence,Arousal'));
    
    // If second section is found, only use data up to that point
    const dataRows = secondSectionIndex !== -1 ? rows.slice(1, secondSectionIndex) : rows.slice(1);
    
    const data = dataRows.map(row => row.split(','));
  
    // Calculate variance for each emotion label
    const variances = headers.slice(1).map((header, index) => {
      const values = data.map(row => parseFloat(row[index + 1]))
                         .filter(val => !isNaN(val));
  
      if (values.length === 0) {
        console.log(`${header}: No valid data`);
        return { label: header, variance: 0 };
      }
  
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
  
      console.log(`${header} - Values: [${values.join(', ')}]`);
      console.log(`${header} - Mean: ${mean.toFixed(4)}, Variance: ${variance.toFixed(4)}`);
      return { label: header, variance };
    });
  
    // Sort variances and get top two
    const topTwo = variances.sort((a, b) => b.variance - a.variance).slice(0, 2);
  
  
    console.log('All variances:', variances);
    console.log('Top two emotions by variance:', topTwo);
  
  
    // Prepare datasets for the top two emotions
    const datasets = topTwo.map((item, index) => ({
      label: item.label,
      data: data.map(row => parseFloat(row[headers.indexOf(item.label)])),
      fill: false,
      borderColor: `hsl(${index * 120}, 100%, 50%)`,
      tension: 0.1
    }));
  
    const configuration = {
      type: 'line',
      data: {
        labels: data.map(row => row[0]),
        datasets: datasets
      },
      options: {
        title: {
          display: true,
          text: 'Top 2 Emotions by Variance'
        }
      }
    };
  
    const image = await chartJSNodeCanvas.renderToBuffer(configuration);
    fs.writeFileSync('top_two_emotions_graph.png', image);
    console.log('Graph saved as top_two_emotions_graph.png');
  };
  
  // Usage remains the same
  const csvFilePath = process.argv[2];
  if (!csvFilePath) {
    console.error('Please provide the path to the CSV file.');
    process.exit(1);
  }
  generateGraph(csvFilePath).catch(console.error);