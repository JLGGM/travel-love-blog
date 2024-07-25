import express from "express";
import fileUpload from 'express-fileupload';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import methodOverride from 'method-override';
import { create } from "domain";

const app = express();
const port = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(fileUpload());
app.use(methodOverride('_method')); // Middleware to override methods
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// Read the JSON file
const readData = () => {
    const data = fs.readFileSync(path.join(__dirname, 'data.json'), 'utf-8');
    return JSON.parse(data);
};

// Write to the JSON file
const writeData = (data) => {
    fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(data, null, 2), 'utf-8');
};

// Initialize nextId based on existing data
const initializeNextId = () => {
    const data = readData();
    if (data.length > 0) {
        nextId = Math.max(...data.map(entry => entry.id)) + 1;
    } else {
        nextId = 1;
    }
};

let nextId;
initializeNextId();

const generateUniqueId = () => nextId++;

app.get("/", (req, res) => {
    const data = readData();
    res.render("index.ejs", { messages: data });
});

app.get("/create", (req, res) => {
    res.render("create.ejs");
});

app.get("/edit", (req, res) => {
    const data = readData();
    const id = parseInt(req.query.id);

    const entry = data.find(item => item.id === id);
    if (!entry) {
        return res.status(404).send('Entry not found');
    }

    res.render("edit", { entry });
});

app.get("/manage", (req, res) => {
    const data = readData();
    res.render("manage.ejs", { messages: data });
});

app.get("/readmoreOne", (req, res) => {
    const data = readData();
    res.render("readmoreOne.ejs", { messages: data });
});

app.get("/readmoreTwo", (req, res) => {
    const data = readData();
    res.render("readmoreTwo.ejs", { messages: data });
});

app.get("/readmore/create", (req, res) => {
    const data = readData();
    res.render("create.ejs", { messages: data });
});

app.get("/readmore/manage", (req, res) => {
    const data = readData();
    res.render("manage.ejs", { messages: data });
});

app.get("/readmore/:id", (req, res) => {
    const data = readData();
    const id = parseInt(req.params.id, 10); // Ensure ID is an integer
    const entry = data.find(item => item.id === id);
    if (!entry) {
        return res.status(404).send('Entry not found');
    }

    res.render("readmore", { entry });
});


app.post("/submit", (req, res) => {
    let uploadedFile = req.files.image;
    const uploadPath = path.join(__dirname, 'public/images', uploadedFile.name);

    uploadedFile.mv(uploadPath, function (err) {
        if (err) {
            return res.status(500).send(err);
        }

        const { title, description, authorname, blogtitle, paragraph } = req.body;
        const newEntry = {
            id: generateUniqueId(), // Assign a unique ID
            title: title,
            description: description,
            imagePath: `images/${uploadedFile.name}`,
            authorName: authorname,
            blogTitle: blogtitle,
            paraGraph: paragraph
        };

        // Read current data
        const data = readData();

        // Add new entry
        data.push(newEntry);

        // Write updated data
        writeData(data);

        res.render("index.ejs", {
            messages: data
        });
    });
});

app.patch("/update/:id", (req, res) => {
    const data = readData();
    const id = parseInt(req.params.id, 10); // Ensure ID is an integer
    const { title, description, authorname, blogtitle, paragraph } = req.body;
    const uploadedFile = req.files ? req.files.image : null;

    const entryIndex = data.findIndex(entry => entry.id === id);
    if (entryIndex === -1) {
        return res.status(404).send('Entry not found');
    }

    // Update text fields
    if (title) data[entryIndex].title = title;
    if (description) data[entryIndex].description = description;
    if (authorname) data[entryIndex].authorName = authorname;
    if (blogtitle) data[entryIndex].blogTitle = blogtitle;
    if (paragraph) data[entryIndex].paraGraph = paragraph;

    // Handle image update
    if (uploadedFile) {
        // Remove old image if exists
        const oldImagePath = path.join(__dirname, 'public', data[entryIndex].imagePath);
        fs.unlink(oldImagePath, (err) => {
            if (err) {
                console.error(`Failed to delete old image file: ${err.message}`);
            }
        });

        // Save new image
        const newImagePath = `images/${uploadedFile.name}`;
        uploadedFile.mv(path.join(__dirname, 'public/images', uploadedFile.name), (err) => {
            if (err) {
                return res.status(500).send(err);
            }

            data[entryIndex].imagePath = newImagePath; // Update image path in data
            writeData(data); // Write updated data to file
            res.redirect("/manage"); // Redirect to manage page
        });
    } else {
        writeData(data); // Write updated data to file without changing image
        res.redirect("/manage"); // Redirect to manage page
    }
});

app.delete("/delete/:id", (req, res) => {
    const data = readData();
    const id = parseInt(req.params.id, 10); // Ensure ID is an integer

    const entryIndex = data.findIndex(entry => entry.id === id);
    if (entryIndex === -1) {
        return res.status(404).send('Entry not found');
    }

    const [deletedEntry] = data.splice(entryIndex, 1);

    // Remove the image file associated with the entry
    const imagePath = path.join(__dirname, 'public', deletedEntry.imagePath);
    fs.unlink(imagePath, (err) => {
        if (err) {
            console.error(`Failed to delete image file: ${err.message}`);
        }
    });

    writeData(data);

    res.redirect("/manage"); // Redirect to the manage page
});

app.listen(port, () => {
    console.log(`Server running on port ${port}.`);
});
