# 🎮 Last War PvP Multiplayer Setup Guide

## 📋 **Tổng quan**
Hệ thống PvP multiplayer real-time cho game Last War sử dụng Colyseus server và Unity client.

## 🚀 **Setup Server**

### 1. **Install Dependencies**
```bash
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

### 3. **Setup Scene**
- Tạo PvP scene mới
- Add `ColyseusManager` prefab

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
```

## 🎯 **Tính năng PvP**

### **Game Modes**
- **2 Player PvP** - Đấu 1v1
- **Real-time** - Đồng bộ hóa real-time

### **Gameplay Elements**
- **Player Movement** - Di chuyển real-time
- **Combat System** - Tấn công, phòng thủ
- **Soldier Spawning** - Sinh quân

### **Win Conditions**
- **Time Limit** - 1 phút 30 giây
- **Enemy Elimination** - Tiêu diệt hết quân phòng thủ

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
