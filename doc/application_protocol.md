# JumpSuit's protocol specification

The protocol's endianness is big-endian.
Messages are serialized with a custom protocol before being sent. This document references JumpSuit's protocol.
Strings are always encoded as UTF-8. When the protocol mandates the length of a string, it is implied the length is an amount of bytes.
Angles are always encoded as brads.
When a value takes only one byte, 1 means enabled and 0 means disabled.


## Notation

Possible values for a field are noted:
 * with a number for the packet type (ex: `4`)
 * with lowercase words for variables (ex: `player name`)
 * with lowercase words between double quotes for strings variables (`"player name"`)
 * with lowercase words starting with a uppercase character for enumerations (ex: `Error Type`)
 * with uppercase snake case for packets and subpayloads (ex: `CREATE_LOBBY`)
Values dubbed `unused bits` are not used, but are present to complete a byte.

Values are enclosed in boxes.
The minus signs (-) indicates the value is required and not repeated.
The tilde (~) indicates the value is optional and not repeated.
The equal sign (=) indicates the value is optional and repeated.

```
+-------+
| value |
+-------+

+~~~~~~~~~~~~~~~~+
| optional value |
+~~~~~~~~~~~~~~~~+

+================+
| repeated value |
+================+
```


## Subpayloads

Subpayloads are sequences of bytes which are always defined after the same scheme. They often represent an entity with multiples properties.
They might be used several times in a packet or in packets with different types.


#### LOBBY
```
     4B                 1B                           1B
+----------+----------------------------+---------------------------+
| lobby id | amount of connected player | maximum amount of players |
+----------+----------------------------+---------------------------+
```


#### PLANET
```
       2B            2B           2B
+--------------+--------------+--------+
| x-coordinate | y-coordinate | radius |
+--------------+--------------+--------+
```


#### ENEMY
```
      2B              2B           1B
+--------------+--------------+------------+
| x-coordinate | y-coordinate | Appearance |
+--------------+--------------+------------+
```

`Appearance` must be either:
 0. `enemyBlack1`
 1. `enemyBlack2`
 2. `enemyBlack3`
 3. `enemyBlack4`
 4. `enemyBlack5`
 5. `enemyBlue1`
 6. `enemyBlue2`
 7. `enemyBlue3`
 8. `enemyBlue4`
 9. `enemyBlue5`
 10. `enemyGreen1`
 11. `enemyGreen2`
 12. `enemyGreen3`
 13. `enemyGreen4`
 14. `enemyGreen5`
 15. `enemyRed1`
 16. `enemyRed2`
 17. `enemyRed3`
 18. `enemyRed4`
 19. `enemyRed5`


#### PLAYER
```
      2B             2B               1B            4B        1b         1b       3b        3b           1B        0-255B
+--------------+--------------+-----------------+-------+------------+---------+------+------------+-------------+--------+
| x-coordinate | y-coordinate | attached planet | angle | looks left | jetpack | Team | Walk Frame | name length | "name" |
+--------------+--------------+-----------------+-------+------------+---------+------+------------+-------------+--------+
```

If `attached planet`'s value is 255, the player is not attached to a planet.
`Walk Frame` must be either:
 0. `duck`
 1. `hurt`
 2. `jump`
 3. `stand`
 4. `walk1`
 5. `walk2`
`Team` must be either:
 0. `blue team`
 1. `beige team`
 2. `green team`
 3. `pink team`
 4. `yellow team`


#### SHOT
```
      2B              2B         1B
+--------------+--------------+-------+
| x-coordinate | y-coordinate | angle |
+--------------+--------------+-------+
```


#### LESSER_PLANET
```
     1B         1B
+----------+----------+
| Owned By | progress |
+----------+----------+
```

Owned By must be either:
 0. `neutral`
 1. `blue team`
 2. `beige team`
 3. `green team`
 4. `pink team`
 5. `yellow team`


#### LESSER_SHOT
```
      2B              2B
+--------------+--------------+
| x-coordinate | y-coordinate |
+--------------+--------------+
```


#### LESSER_PLAYER
```
      2B             2B               1B           1B         1b         1b           3b            3b
+--------------+--------------+-----------------+-------+------------+---------+--------------+------------+
| x-coordinate | y-coordinate | attached planet | angle | looks left | jetpack | useless bits | Walk Frame |
+--------------+--------------+-----------------+-------+------------+---------+--------------+------------+
```


#### PARTIAL_SERVER
```
      2B                1B               0-255B            1B            0-255B     ?*6B
+-------------+--------------------+---------------+-----------------+------------+=======+
| server port | server name length | "server name" | mod name length | "mod name" | LOBBY |
+-------------+--------------------+---------------+-----------------+------------+=======+
```


#### SERVER
```
      1B      0-255B         ?B
+------------+-------+----------------+
| url length | "url" | PARTIAL_SERVER |
+------------+-------+----------------+
```

The `"url"` doesn't contain the port.



## Packets

The first byte of every packet determines its type. A payload may be placed after this first byte. The payload may contain subpayloads or payloads.

```
   1B       ?B
+------+-----------
| Type | payload...
+------+-----------
```

There are 22 packet types.



### Master server ↔ Game server

Game servers will attempt to connect to the master server's websocket at "/game_servers".

#### REGISTER_SERVER (game server → master server)
```
 1B         ?B
+---+----------------+
| 0 | PARTIAL_SERVER |
+---+----------------+
```


#### REGISTER_LOBBIES (game server → master server)
```
 1B   ?*6B
+---+=======+
| 1 | LOBBY |
+---+=======+
```


#### UNREGISTER_LOBBIES (game server → master server)
```
 1B     ?*4B
+---+==========+
| 2 | lobby id |
+---+==========+
```



### Client ↔ Master server

Clients will attempt to connect to the master server's websocket at "/clients".

#### GET_SERVER_LIST (client → master server)
```
 1B
+---+
| 3 |
+---+
```


#### SERVER_LIST (master server → client)
```
 1B    ?*6B
+---+========+
| 4 | SERVER |
+---+========+
```



### Client ↔ Game server

#### CREATE_LOBBY (client → game server)
```
 1B              1B                 0B-255B
+---+---------------------------+--------------+
| 5 | maximum amount of players | "lobby name" |
+---+---------------------------+--------------+
```


#### SET_NAME (client → game server)
```
 1B       0B-?B
+---+---------------+
| 6 | "player name" |
+---+---------------+
```


#### SET_NAME_BROADCAST (client → game server)
```
 1B      1B           0B-?B
+---+-----------+---------------+
| 7 | player id | "player name" |
+---+-----------+---------------+
```


#### CONNECT (client → game server)
```
 1B      4B
+---+----------+
| 8 | lobby id |
+---+----------+
```

The game server will respond with either CONNECT_ACCEPTED or an ERROR.


#### CONNECT_ACCEPTED (game server → client)
```
 1B       1B            2B                2B              3b           1b          1b           1b          1b           1b            ?B
+---+-----------+----------------+-----------------+--------------------------+-----------+------------+-----------+-------------+------------+
| 9 | player id | universe width | universe height | unused bits | beige team | blue team | green team | pink team | yellow team | ADD_ENTITY |
+---+-----------+----------------+-----------------+-------------+------------+-----------+------------+-----------+-------------+------------+
```


#### ERROR (game server → client)
```
  1B       1B
+----+------------+
| 10 | Error Type |
+----+------------+
```

`Error Type` must be either:
 0. no lobby avalaible
 1. no slot avalaible
 2. name taken
 3. name unknown


#### LEAVE_LOBBY (client → game server)
```
  1B      4B
+----+----------+
| 11 | lobby id |
+----+----------+
```

Note: as JumpSuit's client will only need to connect to one looby at once, in future versions the lobby id will be assumed to be the only lobby the player is connected to.


#### LOBBY_STATE (game server → client)
```
  1B       1B         1B
+----+-------------+~~~~~~~+
| 12 | Lobby State | timer |
+----+-------------+~~~~~~~+
```

`Lobby State` must be either:
 0. warmup
 1. game started
 2. game over


#### ADD_ENTITY (game server → client)
```
  1B       1B           ?*6B         1B        ?*5B         1B       ?*5B     ?B
+----+---------------+========+--------------+=======+-------------+======+========+
| 13 | planet amount | PLANET | enemy amount | ENEMY | shot amount | SHOT | PLAYER |
+----+---------------+========+--------------+=======+-------------+======+========+
```


#### REMOVE_ENTITY (game server → client)
```
  1B        1B           ?*1B           1B          ?*1B         1B         ?*1B       ?*1B
+----+---------------+===========+--------------+==========+-------------+=========+===========+
| 14 | planet amount | planet id | enemy amount | enemy id | shot amount | shot id | player id |
+----+---------------+===========+--------------+==========+-------------+=========+===========+
```


#### GAME_STATE (game server → client)
```
  1B       1B           2B           ?*3B           ?*1B          ?*4B           ?*7B
+----+-------------+-----------+===============+=============+=============+===============+
| 15 | your health | your fuel | LESSER_PLANET | enemy angle | LESSER_SHOT | LESSER_PLAYER |
+----+-------------+-----------+===============+=============+=============+===============+
```


#### PLAYER_CONTROLS (client → game server)
```
  1B      2b         1b    1b      1b       1b         1b           1b
+----+-------------+------+-----+--------+---------+-----------+------------+
| 16 | unused bits | jump | run | crouch | jetpack | move left | move right |
+----+-------------+------+-----+--------+---------+-----------+------------+
```


#### ACTION_ONE (client → game server)
```
  1B    2B
+----+-------+
| 17 | angle |
+----+-------+
```


#### ACTION_TWO (client → game server)
```
  1B    2B
+----+-------+
| 18 | angle |
+----+-------+
```


#### CHAT (client → game server)
```
  1B      1B
+----+-----------+
| 19 | "message" |
+----+-----------+
```


#### CHAT_BROADCAST (game server → client)
```
  1B      1B          ?B
+----+-----------+-----------+
| 20 | player id | "message" |
+----+-----------+-----------+
```


#### SCORES (game server → client)
```
  1B       4B
+----+============+
| 21 | team score |
+----+============+
```

There are as many `team score`s as there are teams. Which teams are playing has already been sent with a CONNECT_ACCEPTED message.
The order `team score`s can be mapped to teams is as follow (provided the teams are enabled): beige team, blue team, green team, pink team, yellow team.
