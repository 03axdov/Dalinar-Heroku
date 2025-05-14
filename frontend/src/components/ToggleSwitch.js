import React, { useState, useEffect } from "react";

const ToggleSwitch = ({onUpdate, defaultValue, style, isPublic}) => {
  const [isOn, setIsOn] = useState(defaultValue);

  useEffect(() => {
    if (onUpdate) {
        onUpdate(isOn)
    }
  }, [isOn])

  return (
    <div style={style} className={`switch ${isOn ? "on" : ""}` + (isPublic ? " default-cursor" : "")} onClick={() => {
        if (!isPublic) {
          setIsOn(!isOn)  
        }
        
    }}>
      <div className="handle" />
    </div>
  );
};

export default ToggleSwitch;