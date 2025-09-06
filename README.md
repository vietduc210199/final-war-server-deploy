# 🎮 Last War PvP Multiplayer Setup Guide

## 📋 **Tổng quan**
Hệ thống PvP multiplayer real-time cho game Last War sử dụng Colyseus server và Unity client.

## 🚀 **Setup Server**

### 1. **Install Dependencies**
```bash
cd lw-colyseus-server
npm install
```

### 2. **Start Server**
```bash
npm start
```

Server sẽ chạy tại: `http://localhost:2567`

### 3. **Test Server**
- **Monitor:** `http://localhost:2567/monitor`
- **Playground:** `http://localhost:2567/`

## 🎮 **Setup Unity Client**

### 1. **Install Colyseus Package**
- Mở Unity Package Manager
- Add package from git: `https://github.com/colyseus/colyseus-unity3d.git`

### 2. **Add Scripts to Project**
- Copy `ColyseusManager.cs` vào `Assets/_Project/Scripts/Managers/`
- Copy `PvPNetworkController.cs` vào `Assets/_Project/Scripts/Managers/`
- Copy `PvPUIManager.cs` vào `Assets/_Project/Scripts/UI/`

### 3. **Setup Scene**
- Tạo PvP scene mới
- Add `ColyseusManager` prefab
- Add `PvPNetworkController` prefab
- Add `PvPUIManager` prefab

## 🔧 **Cấu trúc hệ thống**

### **Server (Colyseus)**
```
src/
├── rooms/
│   ├── PvPRoom.ts          # PvP room logic
│   └── schema/
│       └── PvPRoomState.ts # Game state schema
└── app.config.ts            # Server configuration
```

### **Client (Unity)**
```
Scripts/
├── Managers/
│   ├── ColyseusManager.cs      # Network connection
│   └── PvPNetworkController.cs # Gameplay sync
└── UI/
    └── PvPUIManager.cs         # PvP UI
```

## 🎯 **Tính năng PvP**

### **Game Modes**
- **2 Player PvP** - Đấu 1v1
- **Team-based** - Blue vs Red
- **Real-time** - Đồng bộ hóa real-time

### **Gameplay Elements**
- **Player Movement** - Di chuyển real-time
- **Combat System** - Tấn công, phòng thủ
- **Soldier Spawning** - Sinh quân
- **Skill System** - Heal, Boost, Ultimate
- **Gate System** - Spawn enemies tự động

### **Win Conditions**
- **Score Limit** - Đạt 1000 điểm
- **Time Limit** - 5 phút
- **Enemy Elimination** - Tiêu diệt hết quân địch

## 📡 **Network Protocol**

### **Client → Server Messages**
```typescript
// Player movement
"playerMove": { x: number, y: number, z: number }

// Player attack
"playerAttack": { damage: number, range: number }

// Spawn soldier
"spawnSoldier": { x: number, y: number, z: number }

// Use skill
"useSkill": { skillType: string }

// Enemy killed
"enemyKilled": { enemyType: string }
```

### **Server → Client Messages**
```typescript
// Game ended
"gameEnded": { winner: string, blueScore: number, redScore: number }
```

## 🎨 **UI Components**

### **Connection Panel**
- Connect/Disconnect button
- Join/Leave room buttons
- Connection status

### **Game Panel**
- Score display (Blue vs Red)
- Game timer
- Player health & score
- Skill buttons

### **Game End Panel**
- Winner announcement
- Final score
- Return to lobby

## 🚀 **Testing**

### **Local Testing**
1. Start Colyseus server
2. Open Unity PvP scene
3. Click "Connect" → "Join Room"
4. Open second Unity instance for opponent

### **Network Testing**
1. Deploy server to cloud
2. Update server URL in Unity
3. Test with multiple devices

## 🔧 **Customization**

### **Add New Skills**
```csharp
// In PvPRoom.ts
case "newSkill":
    // Implement skill logic
    break;
```

### **Modify Win Conditions**
```csharp
// In PvPRoom.ts
private checkWinConditions() {
    // Add custom win logic
}
```

### **Add New Enemy Types**
```csharp
// In PvPRoomState.ts
@type("string") enemyType: string = "grunt";
```

## 📱 **Performance Tips**

### **Server**
- Use efficient data structures
- Implement rate limiting
- Monitor memory usage

### **Client**
- Interpolate movement
- Batch network updates
- Use object pooling

## 🐛 **Troubleshooting**

### **Common Issues**
1. **Connection Failed**
   - Check server URL
   - Verify firewall settings

2. **Sync Issues**
   - Check network latency
   - Verify interpolation settings

3. **Performance Problems**
   - Reduce sync frequency
   - Optimize game objects

## 📚 **Resources**
- [Colyseus Documentation](https://docs.colyseus.io/)
- [Unity Networking](https://docs.unity3d.com/Manual/UNet.html)
- [Real-time Game Development](https://gamedev.stackexchange.com/)

## 🤝 **Support**
Nếu gặp vấn đề, hãy kiểm tra:
1. Console logs
2. Network monitor
3. Unity profiler
4. Server logs
