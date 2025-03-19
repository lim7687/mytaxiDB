const { MongoClient } = require('mongodb');

async function main() {
    // Replace <connection-string> with your MongoDB URI
    const uri = "mongodb://localhost:27017";
    const client = new MongoClient(uri);
    const startTime = Date.now();

    try {
        await client.connect();
        const endTime = Date.now();
        console.log("Connected to MongoDB!");
        console.log(`Time taken:${endTime - startTime}ms`);

        const db = client.db("testDB");
        const collection = db.collection("users");

        // Insert a document
        await collection.insertOne({ name: "Lim", age: 21 });
        console.log("Document inserted!");

        // Query the document
        const result = await collection.findOne({ name: "Lim" });
        console.log("Query result:", result);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.close();
    }
}

main();


