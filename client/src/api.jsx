const SERVER = "http://localhost:3000"

export async function getSearchList(searchTerm) {
    const response = await fetch(`${SERVER}/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            searchTerm: searchTerm
        })
    })

    return await response.json()
}

export async function getVideos(videoIds) {
    const response = await fetch(`${SERVER}/video`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            videoIds: videoIds
        })
    })

    return await response.json()
}