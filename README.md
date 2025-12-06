# Django WebRTC Group Video Call

A simple Django project for **group video calling** using WebRTC.  
Users can join rooms and share video streams in real time.  
The app works locally for testing.  

⚠️ **Note:** In production, a TURN server is required to ensure connections across all networks.

---

## Installation & Local Development

1. **Clone the repository and enter it**  
`git clone https://github.com/Avishek-Ad/webrtc-demo.git && cd webrtc-demo`

2. **Create and activate a virtual environment**  
Linux/macOS: `python -m venv venv && source venv/bin/activate`  
Windows: `python -m venv venv && venv\Scripts\activate`

3. **Install dependencies**  
`pip install -r requirements.txt`

4. **Run migrations and start the server**  
`python manage.py migrate && python manage.py runserver`

5. **Open in your browser**  
[http://127.0.0.1:8000/](http://127.0.0.1:8000/)
