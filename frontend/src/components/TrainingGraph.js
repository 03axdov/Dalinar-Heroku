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

const TrainingGraph = ({ data, is_validation, is_training=false, border=true }) => {

  return (
    <div style={{ width: '100%', height: 400 }} className={"training-graph " + (!border ? "no-border" : "")}>
      {data && data.length > 0 && <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="3 3" />
          
          <XAxis
            dataKey="epoch"
            label={{ value: 'Epoch', position: 'insideBottomRight', offset: -5 }}
          />
          
          {/* Y-axis for Accuracy (left) */}
          <YAxis
            yAxisId="left"
            label={{ value: 'Accuracy', angle: -90, position: 'insideLeft' }}
          />

          {/* Y-axis for Loss (right) */}
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: 'Loss', angle: -90, position: 'insideRight' }}
          />
          
          <Tooltip 
            contentStyle={{
                backgroundColor: 'var(--background-dark)',
                border: '1px solid var(--border)',
                color: '#fff',
                borderRadius: '8px'
            }}
            labelFormatter={(label) => "Epoch " + label}
          />

          <Legend />
          
          {/* Accuracy line on left Y-axis */}
          <Line
            type="monotone"
            dataKey={is_validation ? "val_accuracy" : "accuracy"}
            stroke="rgb(9, 239, 255)"
            name={is_validation ? "Validation Accuracy" : "Accuracy"}
            dot={{ r: 3, stroke: "rgb(9, 239, 255)", fill: "rgb(9, 239, 255)", opacity: 0.5 }}
            yAxisId="left"
            isAnimationActive={!is_training}
          />

          {/* Loss line on right Y-axis */}
          <Line
            type="monotone"
            dataKey={is_validation ? "val_loss" : "loss"}
            stroke="rgb(247, 0, 206)"
            name={is_validation ? "Validation Loss" : "Loss"}
            dot={{ r: 3, stroke: "rgb(247, 0, 206)", fill: "rgb(247, 0, 206)", opacity: 0.5 }}
            yAxisId="right"
            isAnimationActive={!is_training}
          />
        </LineChart>
      </ResponsiveContainer>}
    </div>
  );
};

export default TrainingGraph;