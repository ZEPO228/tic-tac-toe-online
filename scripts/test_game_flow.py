#!/usr/bin/env python3
"""End-to-end test of bot game flow via HTTP API."""
import json
import requests

BASE = "https://web-production-1a709.up.railway.app"
USERNAME = "agent_test_2026"
PASSWORD = "testpass123"

s = requests.Session()

# 1. Login
print("\n=== 1. LOGIN ===")
r = s.post(f"{BASE}/api/auth/login", json={"username": USERNAME, "password": PASSWORD})
print(f"Status: {r.status_code}")
data = r.json()
print(f"User: {data.get('user', {}).get('username')}")
user_id = data.get('user', {}).get('id')

# 2. Create bot game
print("\n=== 2. CREATE BOT GAME ===")
r = s.post(f"{BASE}/api/game/bot-move", json={"action": "create"})
print(f"Status: {r.status_code}")
data = r.json()
print(f"Game ID: {data.get('gameId')}")
print(f"Board: {data.get('board')}")
print(f"Player symbol: {data.get('playerSymbol')}, Bot symbol: {data.get('botSymbol')}")
print(f"Current turn: {data.get('currentTurn')}")
game_id = data['gameId']

# 3. Make moves — try to win
# Player X (us): positions 0, 1, 2 (top row win)
# We make move, bot makes move, repeat
moves_sequence = [0, 1, 2]  # try to win top row

print("\n=== 3. PLAY GAME (try to win top row 0,1,2) ===")
for move in moves_sequence:
    print(f"\n-- Player move: cell {move} --")
    r = s.post(f"{BASE}/api/game/bot-move", json={"action": "move", "gameId": game_id, "index": move})
    print(f"Status: {r.status_code}")
    data = r.json()
    if r.status_code != 200:
        print(f"Error: {data}")
        break
    print(f"Board: {data['board']}")
    print(f"Current turn: {data['currentTurn']}")
    print(f"Status: {data['status']}")
    if data.get('winner'):
        print(f"Winner: {data['winner']}")
        print(f"Winning line: {data.get('winningLine')}")
        break

# 4. Check profile/stats after game
print("\n=== 4. PROFILE AFTER GAME ===")
r = s.get(f"{BASE}/api/profile")
data = r.json()['user']
print(f"gamesPlayed: {data['gamesPlayed']}")
print(f"gamesWon: {data['gamesWon']}")
print(f"gamesLost: {data['gamesLost']}")
print(f"gamesDraw: {data['gamesDraw']}")
print(f"winRate: {data['winRate']}")

# 5. Try invalid moves
print("\n=== 5. INVALID MOVE TEST (cell out of range) ===")
r = s.post(f"{BASE}/api/game/bot-move", json={"action": "move", "gameId": game_id, "index": 99})
print(f"Status: {r.status_code} (expected 400)")
print(f"Body: {r.json()}")

print("\n=== 6. INVALID MOVE TEST (occupied cell) ===")
r = s.post(f"{BASE}/api/game/bot-move", json={"action": "move", "gameId": game_id, "index": 0})
print(f"Status: {r.status_code} (expected 400)")
print(f"Body: {r.json()}")

# 7. Try access non-existing game
print("\n=== 7. NON-EXISTING GAME ===")
r = s.post(f"{BASE}/api/game/bot-move", json={"action": "move", "gameId": "fake-game-id", "index": 0})
print(f"Status: {r.status_code} (expected 404)")
print(f"Body: {r.json()}")

# 8. Try without auth
print("\n=== 8. UNAUTH ACCESS ===")
r = requests.post(f"{BASE}/api/game/bot-move", json={"action": "create"})
print(f"Status: {r.status_code} (expected 401)")
print(f"Body: {r.json()}")

# 9. Test DM — send to self (should fail)
print("\n=== 9. DM TO SELF (should fail) ===")
r = s.post(f"{BASE}/api/direct-messages/send", json={"recipientId": user_id, "text": "hello self"})
print(f"Status: {r.status_code} (expected 400)")
print(f"Body: {r.json()}")

# 10. Test DM to another player
print("\n=== 10. DM TO ANOTHER PLAYER ===")
# Get list of players first
r = s.get(f"{BASE}/api/players")
players = r.json()['players']
other = next((p for p in players if p['id'] != user_id), None)
if other:
    print(f"Sending DM to: {other['username']} ({other['id']})")
    r = s.post(f"{BASE}/api/direct-messages/send", json={"recipientId": other['id'], "text": "Test from agent"})
    print(f"Status: {r.status_code}")
    print(f"Body: {r.json()}")

    # 11. Get DM history
    print("\n=== 11. DM HISTORY ===")
    r = s.get(f"{BASE}/api/direct-messages/{other['id']}")
    print(f"Status: {r.status_code}")
    data = r.json()
    print(f"Other user: {data['otherUser']['username']}")
    print(f"Messages count: {len(data['messages'])}")

    # 12. Get contacts
    print("\n=== 12. CONTACTS LIST ===")
    r = s.get(f"{BASE}/api/direct-messages/contacts")
    print(f"Status: {r.status_code}")
    print(f"Contacts: {r.json()}")

    # 13. Delete DM conversation
    print("\n=== 13. DELETE DM CONVERSATION ===")
    r = s.post(f"{BASE}/api/direct-messages/delete", json={"otherUserId": other['id']})
    print(f"Status: {r.status_code}")
    print(f"Body: {r.json()}")

# 14. Test stats endpoint
print("\n=== 14. STATS ===")
r = requests.get(f"{BASE}/api/stats")
print(f"Status: {r.status_code}")
print(f"Body: {r.json()}")

# 15. Test debug endpoint
print("\n=== 15. DEBUG ===")
r = requests.get(f"{BASE}/api/debug")
print(f"Status: {r.status_code}")
print(f"Body: {r.json()}")

# 16. Test logout
print("\n=== 16. LOGOUT ===")
r = s.post(f"{BASE}/api/auth/logout")
print(f"Status: {r.status_code}")

# 17. Try access protected after logout
print("\n=== 17. POST-LOGOUT ACCESS ===")
r = s.get(f"{BASE}/api/profile")
print(f"Status: {r.status_code} (expected 401)")
print(f"Body: {r.json()}")

# 18. Login with wrong password
print("\n=== 18. WRONG PASSWORD ===")
r = requests.post(f"{BASE}/api/auth/login", json={"username": USERNAME, "password": "wrongpass"})
print(f"Status: {r.status_code} (expected 401)")
print(f"Body: {r.json()}")

# 19. Register with short username
print("\n=== 19. SHORT USERNAME REGISTER ===")
r = requests.post(f"{BASE}/api/auth/register", json={"username": "ab", "password": "pass1234"})
print(f"Status: {r.status_code} (expected 400)")
print(f"Body: {r.json()}")

# 20. Try to register same username again
print("\n=== 20. DUPLICATE USERNAME ===")
r = requests.post(f"{BASE}/api/auth/register", json={"username": USERNAME, "password": "pass1234"})
print(f"Status: {r.status_code} (expected 409)")
print(f"Body: {r.json()}")

print("\n=== ALL TESTS DONE ===")
