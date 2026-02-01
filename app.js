// ---- FIREBASE INIT ----
const firebaseConfig = {
  apiKey: "AIzaSyBIJyoxJIXiJnrnzlNYV4Y3rdRdgrI_8tI",
  authDomain: "silvercreed-ec87a.firebaseapp.com",
  databaseURL: "https://silvercreed-ec87a-default-rtdb.firebaseio.com",
  projectId: "silvercreed-ec87a",
  storageBucket: "silvercreed-ec87a.firebasestorage.app",
  messagingSenderId: "419719706211",
  appId: "1:419719706211:web:006287da1c6a1aa2086a56",
  measurementId: "G-GCRJMLHRG0"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();

// ---- GLOBAL STATE ----
let currentUser=null;
const taskCooldown = 24*60*60*1000; // 24 hours in ms

// ---- LOGIN/SIGNUP ----
function loginSignup() {
    const name = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('password').value;
    if (!name || !email || !pass) { alert("Fill all fields"); return; }

    auth.signInWithEmailAndPassword(email, pass)
    .then((cred)=>{ currentUser=cred.user; loadDashboard(); })
    .catch((err)=>{
        if(err.code==='auth/user-not-found'){
            auth.createUserWithEmailAndPassword(email, pass)
            .then((cred)=>{
                currentUser=cred.user;
                db.ref('users/'+currentUser.uid).set({
                    name:name,
                    totalBalance:0,
                    earnedIncome:0,
                    referralIncome:0,
                    lastTask:0
                });
                loadDashboard();
            });
        } else { alert(err.message); }
    });
}

// ---- DASHBOARD ----
function loadDashboard(){
    document.getElementById('loginPage').style.display='none';
    document.getElementById('dashboardPage').style.display='block';
    const userRef = db.ref('users/'+currentUser.uid);
    userRef.on('value', snapshot=>{
        const data = snapshot.val();
        document.getElementById('userDisplay').innerText = data.name;
        document.getElementById('totalBalance').innerText = data.totalBalance.toFixed(2);
        document.getElementById('earnedIncome').innerText = data.earnedIncome.toFixed(2);
        document.getElementById('referralIncome').innerText = data.referralIncome.toFixed(2);

        // Task cooldown
        const now = Date.now();
        const diff = now - data.lastTask;
        if(diff >= taskCooldown){
            document.getElementById('taskBtn').disabled=false;
            document.getElementById('countdown').innerText="Ready!";
        } else {
            document.getElementById('taskBtn').disabled=true;
            startCountdown(taskCooldown - diff);
        }
    });
}

// ---- TASK CLAIM ----
function claimTask(){
    const income = 5; // daily click income
    const userRef = db.ref('users/'+currentUser.uid);
    userRef.transaction(user=>{
        if(user){
            user.earnedIncome += income;
            user.totalBalance += income;
            user.lastTask = Date.now();
        }
        return user;
    });
}

// ---- COUNTDOWN ----
function startCountdown(ms){
    const interval = setInterval(()=>{
        if(ms <=0){ clearInterval(interval); document.getElementById('taskBtn').disabled=false; document.getElementById('countdown').innerText="Ready!"; return; }
        ms -= 1000;
        let h = Math.floor(ms/3600000);
        let m = Math.floor((ms%3600000)/60000);
        let s = Math.floor((ms%60000)/1000);
        document.getElementById('countdown').innerText=`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    },1000);
}

// ---- NAVIGATION ----
function showPage(page){
    ['dashboard','packages','deposit','withdraw'].forEach(p=>{
        document.getElementById(p).style.display = (p===page) ? 'block':'none';
    });
}

// ---- LOGOUT ----
function logout(){ auth.signOut().then(()=>{ location.reload(); }); }

// ---- PACKAGES ----
const packages=[
    {name:"Starter",price:10,roi:0.02},{name:"Basic",price:25,roi:0.02},
    {name:"Silver",price:50,roi:0.02},{name:"Gold",price:100,roi:0.02},
    {name:"Platinum",price:150,roi:0.02},{name:"Diamond",price:200,roi:0.02},
    {name:"Elite",price:250,roi:0.02},{name:"VIP",price:300,roi:0.02},
    {name:"Ultra",price:400,roi:0.02},{name:"Titan",price:500,roi:0.02}
];
function loadPackages(){
    const container = document.getElementById('packageContainer');
    container.innerHTML='';
    packages.forEach(p=>{
        const card=document.createElement('div');
        card.className='package';
        card.innerHTML=`<h4>${p.name}</h4>Price: $${p.price}<br>Daily Return: ${p.roi*100}%<br><button onclick="buyPackage(${p.price},'${p.name}')">Buy</button>`;
        container.appendChild(card);
    });
}
function buyPackage(price,name){
    const userRef = db.ref('users/'+currentUser.uid);
    userRef.transaction(user=>{
        if(user && user.totalBalance >= price){ user.totalBalance -= price; alert(name + " purchased!"); }
        else{ alert("Insufficient balance"); }
        return user;
    });
}

// ---- DEPOSIT ----
function depositFunds(e){
    e.preventDefault();
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const file = document.getElementById('depositScreenshot').files[0];
    if(!file){ alert("Upload screenshot"); return; }

    const storageRef = storage.ref('deposits/' + Date.now() + '_' + file.name);
    storageRef.put(file).then(snapshot=>{
        snapshot.ref.getDownloadURL().then(url=>{
            db.ref('deposits').push({
                user: currentUser.uid,
                amount: amount,
                screenshot: url,
                status: 'pending'
            });
            alert("Deposit submitted!");
        });
    });
}

// ---- WITHDRAW ----
function withdrawFunds(e){
    e.preventDefault();
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const method = document.getElementById('withdrawMethod').value;
    const number = document.getElementById('withdrawNumber').value;
    if(!number){ alert("Enter account number"); return; }

    const userRef = db.ref('users/'+currentUser.uid);
    userRef.transaction(user=>{
        if(user && user.totalBalance >= amount){
            user.totalBalance -= amount;
            db.ref('withdrawals').push({
                user:currentUser.uid,
                amount:amount,
                method:method,
                number:number,
                status:'pending'
            });
            alert("Withdrawal submitted!");
        } else { alert("Insufficient balance"); }
        return user;
    });
}

// ---- INIT ----
window.onload = loadPackages;
