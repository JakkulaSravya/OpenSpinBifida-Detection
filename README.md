# 🧠 Spina Bifida Detection and Classification

An AI-powered web application for automated detection and classification of **Spina Bifida** from fetal ultrasound images using deep learning. The system assists healthcare professionals by providing AI-based predictions through a secure and user-friendly web platform to support clinical decision-making.

---

## 📌 Overview

Spina Bifida is a congenital neural tube defect that can be detected during pregnancy through fetal ultrasound imaging. This project integrates a deep learning model with a full-stack web application to support early screening and classification, enabling healthcare professionals to analyze ultrasound images, manage patient records, and review AI-assisted prediction results through an intuitive interface.

---

## ✨ Key Features

- 🔍 AI-powered Spina Bifida detection from fetal ultrasound images
- 🧬 Multi-class classification using a trained deep learning model
- 🔐 Secure authentication for doctors and patients
- 📤 Upload and analyze fetal ultrasound scans
- 🩺 Doctor and Patient dashboards
- 📁 Patient record management
- 📊 Prediction history and report generation
- 📱 Responsive and user-friendly interface

---

## 🛠️ Tech Stack

### Frontend
- React.js
- JavaScript
- Vite
- HTML5
- CSS3

### Backend
- Node.js
- Express.js
- REST API

### Artificial Intelligence
- Python
- PyTorch
- OpenCV
- NumPy
- Pillow

### Database
- MongoDB

---

## 🤖 AI Model

The application uses a deep learning model trained on fetal ultrasound images to detect and classify Spina Bifida.

### Frameworks & Libraries

- PyTorch
- OpenCV
- NumPy
- Pillow

### Input

- Fetal ultrasound image

### Output

- Spina Bifida prediction
- Classification result

---

## 📂 Project Structure

```text
spina_bifida_detection_and_classification/
│
├── backend/
│   ├── middleware/
│   ├── models/
│   ├── models_ai/
│   ├── routes/
│   ├── uploads/
│   ├── predict.py
│   ├── server.js
│   └── requirements-ml.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/BhavyasriEdupuganti0611/spina_bifida-detection-and-clasiification.git
cd spina_bifida-detection-and-clasiification
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment:

**macOS/Linux**

```bash
source venv/bin/activate
```

**Windows**

```bash
venv\Scripts\activate
```

Install Python dependencies:

```bash
pip install -r requirements-ml.txt
```

Create a `.env` file inside the `backend` folder:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=5000
```

Start the backend server:

```bash
node server.js
```

### 3. Frontend Setup

Open a new terminal and run:

```bash
cd frontend
npm install
npm run dev
```

> **Note:** Ensure MongoDB is running locally or update `MONGO_URI` with your MongoDB Atlas connection string before starting the backend.

> **Recommended Python Version:** Python 3.10 or Python 3.11.

---

## 🔄 Workflow

1. User logs into the application.
2. User uploads a fetal ultrasound image.
3. The backend processes the uploaded image.
4. The AI model analyzes the image and predicts the presence and classification of Spina Bifida.
5. The prediction results are displayed through the web application.
6. Patient records and prediction history are securely maintained.

---

## 🚀 Future Enhancements

- 🔬 Explainable AI using Grad-CAM visualization
- ☁️ Cloud deployment
- 🐳 Docker containerization
- ⚡ Model optimization for faster inference
- 🏥 Electronic Health Record (EHR) integration

---

## 👥 Team

This project was collaboratively developed by:

- **Bhavyasri Edupuganti**
- **Navya D.**
- **Sravya J.**
- **Srinidi**

---

## 📄 License

This project is developed for academic and research purposes.

---

⭐ If you find this project interesting, consider giving it a ⭐ on GitHub.
