import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';

const TrainingGraph = ({ data, is_validation }) => {
  return (
    <div style={{ width: '100%', height: 400 }} className="training-graph">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid stroke="#fff" strokeDasharray="5 5" />
          <XAxis dataKey="epoch" label={{ value: 'Epoch', position: 'insideBottomRight', offset: -5 }} />
          <YAxis label={{ value: 'Value', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            contentStyle={{
                backgroundColor: 'var(--background-dark)',
                border: '1px solid var(--border)',
                color: '#fff',
                borderRadius: '8px'
            }}

            />
          <Legend />
          <Line type="monotone" dataKey={is_validation ? "val_accuracy" : "accuracy"} stroke="rgb(9, 239, 255)" name={(is_validation ? "Validation Accuracy" : "Accuracy")} />
          <Line type="monotone" dataKey={is_validation ? "val_loss" : "loss"} stroke="rgb(247, 0, 206)" name={(is_validation ? "Validation Loss" : "Loss")} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrainingGraph;