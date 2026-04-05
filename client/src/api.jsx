const SERVER = "http://localhost:3000"

export async function test() {
    const response = await fetch(`${SERVER}/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({nani: "pinablle"})
    })

    const result = await response.text();
    console.log(result)
}