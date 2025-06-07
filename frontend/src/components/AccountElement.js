import React, {useState} from "react"
import {useNavigate} from "react-router-dom"

function AccountElement({account, BACKEND_URL, loading}) {

    if (!loading) {
        return (
            <a target="_blank" href={"/all/accounts/" + account.name} className="account-element">

                <div className="account-element-left account-element-part">
                    <img className="account-element-image" src={account.image || (BACKEND_URL + "/static/images/default-profile.svg")} />
                    <p className="account-element-name">{account.name}</p>
                </div>

                <div className="account-element-right">
                    <p className="account-element-downloads" title={account.total_downloads + " total download" + (account.total_downloads == 1 ? "" : "s")}>
                        <span className="account-stat-color account-color-1"></span>
                        <span className="account-element-stat-text">{account.total_downloads} total download{account.total_downloads == 1 ? "" : "s"}</span>
                    </p>

                    <p className="account-element-datasets" title={account.dataset_count + " datasets" + (account.dataset_count == 1 ? "" : "s")}>
                        <span className="account-stat-color account-color-2"></span>
                        <span className="account-element-stat-text">{account.dataset_count} dataset{account.dataset_count == 1 ? "" : "s"}</span>
                    </p>
                        
                    <p className="account-element-models" title={account.model_count + " models" + (account.model_count == 1 ? "" : "s")}>
                        <span className="account-stat-color account-color-3"></span>
                         <span className="account-element-stat-text">{account.model_count} model{account.model_count == 1 ? "" : "s"}</span>
                    </p>
                </div>
                

            </a>
        )
    } else {
        return <div style={{marginTop: "40px"}}>
            <img style={{width: "16px", marginRight: "10px"}} src={BACKEND_URL + "/static/images/loading.gif"} />
            Loading users
        </div>
    }
}


export default AccountElement