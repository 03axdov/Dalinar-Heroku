import React, { useState, useEffect, useRef, useCallback } from "react"
import axios from "axios"
import AccountElement from "../components/AccountElement"
import { debounce } from 'lodash';
import { useParams, useNavigate } from "react-router-dom";

function Accounts({BACKEND_URL, notification}) {
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)

    const [accounts, setAccounts] = useState([])
    const [nextPageAccounts, setNextPageAccounts] = useState(null)

    const [search, setSearch] = useState("")
    const [sort, setSort] = useState("-total_downloads")

    useEffect(() => {
        getAccounts()
    }, [sort])

    const getAccounts = () => {
        setLoading(true)

        let URL = window.location.origin + "/api/accounts/?"
        URL += "search=" + search +
                "&order_by=" + sort

        axios({
            method: 'GET',
            url: URL
        })
        .then((res) => {
            console.log(res.data)
            if (res.data) {
                setAccounts(res.data.results)
                setNextPageAccounts(res.data.next)
            } else {
                setAccounts([])
                setNextPageAccounts(null)
            }

        }).catch((err) => {
            notification("An error occured while loading accounts.", "failure")
            console.log(err)
        }).finally(() => {
            setLoading(false)
        })
        
    }

    const loadMoreAccounts = useCallback(debounce(() => {
        if (!nextPageAccounts || loading) return;
        setLoading(true);
        axios.get(nextPageAccounts)
            .then((res) => {
                if (res.data) {
                    setAccounts(prev => {
                        const combined = [...prev, ...res.data.results];

                        // Deduplicate based on user
                        const unique = Array.from(
                            new Map(combined.map(item => [item.user, item])).values()
                        );

                        return unique;
                    });
                    setNextPageAccounts(res.data.next);
                }
            })
            .catch(err => {
                notification("An error occurred while loading more accounts.", "failure");
            })
            .finally(() => setLoading(false));
    }, 500), [nextPageAccounts, loading]);

    const loaderRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && nextPageAccounts) {
                    loadMoreAccounts();
                }
            },
            { threshold: 1.0 }
        );

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => {
            if (loaderRef.current) {
                observer.unobserve(loaderRef.current);
            }
        };
    }, [loaderRef.current, nextPageAccounts, loading]);

    const firstSearch = useRef(true)
    // Search input timing
    useEffect(() => {
        if (firstSearch.current) {
            firstSearch.current = false; // Set to false after first render
            return;
        }
        // Set a timeout to update debounced value after 500ms
        setLoading(true)
        const handler = setTimeout(() => {
            getAccounts()
        }, 350);
    
        // Cleanup the timeout if inputValue changes before delay
        return () => {
            clearTimeout(handler);
        };
    }, [search]);

    return (<div className="accounts-container">
        <div className="accounts-left">
            <h2 className="accounts-title">Accounts</h2>
            <div className="explore-datasets-search-container accounts-search-container">
                <input title="Will search names." type="text" className="explore-datasets-search" value={search} placeholder="Search accounts" onChange={(e) => {
                        setLoading(true)
                        setSearch(e.target.value)
                }} /> 
                <img className="explore-datasets-search-icon" src={BACKEND_URL + "/static/images/search.png"} alt="Search" />
            </div>

            <select title="Sort by" className="explore-datasets-sort accounts-sort" value={sort} onChange={(e) => {
                setSort(e.target.value)
            }}>
                <option value="-total_downloads">Downloads</option>
                <option value="name">Alphabetical</option>
                <option value="-model_count">Model count</option>
                <option value="-dataset_count">Dataset count</option>
            </select>
        </div>
        
        <div className="accounts-right">
            {accounts.map((account, idx) => (
                <AccountElement account={account} BACKEND_URL={BACKEND_URL} key={idx} />
            ))}

            {nextPageAccounts && <div ref={loaderRef}>Loading...</div>}
        </div>
    </div>)
}

export default Accounts