import React, { createContext, useContext, useState } from "react";
import axios from "axios"

const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
    const ongoingCalls = new Set([])

    function getTaskResult(callName, interval, task_id, on_success, on_failure, on_progress, on_exit) {
        if (ongoingCalls.has(callName)) return;
        ongoingCalls.add(callName)
        axios({
            method: 'GET',
            url: window.location.origin + '/api/task-result/' + task_id,
        })
        .then((res) => {
            if (res.data["status"] != "in progress") {
                clearInterval(interval)

                if (res.data["status"] != "failed") {
                    on_success(res.data)
                } else {
                    on_failure(res.data)
                }

                on_exit(res.data)

            } else {
                on_progress(res.data)
            }
        })
        .catch(error => {
            notification("An error occured: " + error, "failure")
            console.log(error)
        })
        .finally(() => {
            ongoingCalls.delete(callName)
        });
    }

    return (
        <TaskContext.Provider value={{ getTaskResult }}>
          {children}
        </TaskContext.Provider>
    );
};

export const useTask = () => useContext(TaskContext);