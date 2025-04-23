import React, { useEffect, useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Grid, 
  Paper,
  Box,
  ThemeProvider,
  createTheme
} from '@material-ui/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { API } from 'aws-amplify';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

interface CrowdData {
  cameraId: string;
  timestamp: number;
  peopleCount: number;
  metadata: {
    confidence: number;
  };
}

function App() {
  const [crowdData, setCrowdData] = useState<CrowdData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await API.get('crowdManagementApi', '/crowd', {});
        setCrowdData(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching crowd data:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="App">
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6">
              Crowd Management Dashboard
            </Typography>
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" style={{ marginTop: '2rem' }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper style={{ padding: '1rem' }}>
                <Typography variant="h5" gutterBottom>
                  Real-time Crowd Analysis
                </Typography>
                {loading ? (
                  <Typography>Loading data...</Typography>
                ) : (
                  <LineChart
                    width={800}
                    height={400}
                    data={crowdData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={formatTimestamp}
                      formatter={(value: number) => [`${value} people`, 'Count']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="peopleCount"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper style={{ padding: '1rem' }}>
                <Typography variant="h6" gutterBottom>
                  Current Statistics
                </Typography>
                {crowdData.length > 0 && (
                  <Box>
                    <Typography>
                      Latest Count: {crowdData[crowdData.length - 1].peopleCount} people
                    </Typography>
                    <Typography>
                      Detection Confidence: {crowdData[crowdData.length - 1].metadata.confidence.toFixed(2)}%
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </div>
    </ThemeProvider>
  );
}

export default App; 