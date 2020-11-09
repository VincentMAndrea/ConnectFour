using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Net;
using System.Net.Sockets;
using TMPro;
using System;
using System.Security.Cryptography;

public enum Panel
{
    Host,
    Username,
    Gameplay,
    GameOver
}
public class ControllerGameClient : MonoBehaviour
{
    static public ControllerGameClient singleton;

    TcpClient socket = new TcpClient();

    Buffer buffer = Buffer.Alloc(0);

    public TMP_InputField inputHost;
    public TMP_InputField inputPort;
    public TMP_InputField inputUsername;

    public TextMeshProUGUI winnerText;
    public TextMeshProUGUI errorText;

    public Transform panelHostDetails;
    public Transform panelUsername;
    public Transform panelGameOver;
    public ControllerGameplay panelGameplay;

    void Start()
    {
        if (singleton)
        {
            // already set...
            Destroy(gameObject); //there's already one out there...
        }
        else
        {
            singleton = this;
            DontDestroyOnLoad(gameObject); // don't destroy when loading a new scene
            SwitchToPanel(Panel.Host);
        }
    }

    public void SwitchToPanel(Panel panel)
    {
        switch (panel)
        {
            case Panel.Host:
                panelHostDetails.gameObject.SetActive(true);
                panelUsername.gameObject.SetActive(false);
                panelGameplay.gameObject.SetActive(false);
                panelGameOver.gameObject.SetActive(false);
                break;
            case Panel.Username:
                panelHostDetails.gameObject.SetActive(false);
                panelUsername.gameObject.SetActive(true);
                panelGameplay.gameObject.SetActive(false);
                panelGameOver.gameObject.SetActive(false);
                break;
            case Panel.Gameplay:
                panelHostDetails.gameObject.SetActive(false);
                panelUsername.gameObject.SetActive(false);
                panelGameplay.gameObject.SetActive(true);
                panelGameOver.gameObject.SetActive(false);
                break;
            case Panel.GameOver:
                panelHostDetails.gameObject.SetActive(false);
                panelUsername.gameObject.SetActive(false);
                panelGameplay.gameObject.SetActive(false);
                panelGameOver.gameObject.SetActive(true);
                break;
            default:
                break;
        }
    }

    public void OnButtonConnect()
    {
        string host = inputHost.text;
        UInt16.TryParse(inputPort.text, out ushort port);

        TryToConnect(host, port);
    }

    public void OnButtonUsername()
    {
        string name = inputUsername.text;
        Buffer packet = PacketBuilder.Join(name);
        SendPacketToServer(packet);
    }

    public void OnButtonRematch()
    {
        SendRematchPacket();
    }

    public void OnButtonQuit()
    {
        Application.Quit();
    }

    public async void TryToConnect(string host, int port)
    {
        if (socket.Connected) return; // already connected to a server, cancel...

        try
        {
            await socket.ConnectAsync(host, port);
            SwitchToPanel(Panel.Username);
            StartReceivingPackets();
        }
        catch (Exception e)
        {
            print("Failed to Connect...");
            SwitchToPanel(Panel.Host);
        }
    }

    public async void StartReceivingPackets()
    {
        int maxPacketSize = 4096;
        while (socket.Connected)
        {
            byte[] data = new byte[maxPacketSize];

            try
            {
                int bytesRead = await socket.GetStream().ReadAsync(data, 0, maxPacketSize);

                buffer.Concat(data, bytesRead);

                ProcessPackets();
            }
            catch (Exception e)
            {
                                
            }
        }   
    }

    void ProcessPackets()
    {
        if (buffer.Length < 4) return; // not enough data in the buffer

        string packetIdentifier = buffer.ReadString(0, 4);

        switch (packetIdentifier)
        {
            case "JOIN":
                if (buffer.Length < 5) return; // not enough data for a JOIN packet
                byte joinResponse = buffer.ReadUInt8(4);
                if (joinResponse == 1 || joinResponse == 2 || joinResponse == 3 )
                {
                    panelGameplay.SetPlayerColor(joinResponse);
                    SwitchToPanel(Panel.Gameplay);                    
                }
                else if (joinResponse == 4)
                {
                    errorText.text = "Username too short.";
                    SwitchToPanel(Panel.Username);
                }
                else if (joinResponse == 5)
                {
                    errorText.text = "Username too long.";
                    SwitchToPanel(Panel.Username);
                }
                else if (joinResponse == 6)
                {
                    errorText.text = "Username contains invalid characters.";
                    SwitchToPanel(Panel.Username);
                }
                else if (joinResponse == 7)
                {
                    errorText.text = "Username already taken.";
                    SwitchToPanel(Panel.Username);
                }
                else if (joinResponse == 8)
                {
                    errorText.text = "Username contains profanity.";
                    SwitchToPanel(Panel.Username);
                }
                else if (joinResponse == 9)
                {
                    errorText.text = "Server is full.";
                    SwitchToPanel(Panel.Username);
                }
                else
                {
                    errorText.text = "Could not connect to server, unknown error.";
                    SwitchToPanel(Panel.Username);
                }

                buffer.Consume(5);
                break;
            case "UPDT":
                if (buffer.Length < 48) return; // not enough data for an UPDT packet
                SwitchToPanel(Panel.Gameplay);
                byte whoseTurn = buffer.ReadUInt8(4);
                byte gameStatus = buffer.ReadUInt8(5);
                if (gameStatus != 0)
                {
                    SwitchToPanel(Panel.GameOver);
                    switch (gameStatus)
                    {
                        case 1:
                            winnerText.text = "Red Wins!";
                            break;
                        case 2:
                            winnerText.text = "Blue Wins!";
                            break;
                        case 3:
                            winnerText.text = "Tie Game!";
                            break;
                        default:
                            break;
                    }
                }
                //print(buffer);
                byte[] spaces = new byte[42];
                for (int i = 0; i < 42; i++)
                {
                    spaces[i] = buffer.ReadUInt8(6 + i);
                }

                //print(buffer);
                buffer.Consume(48);
                panelGameplay.UpdateFromServer(whoseTurn, spaces);
                break;
            case "CHAT":
                byte usernameLength = buffer.ReadByte(4);
                ushort messageLength = buffer.ReadUInt16BE(5);

                if (buffer.Length < 7 + usernameLength + messageLength) return;
                
                SwitchToPanel(Panel.Gameplay);

                string username = buffer.ReadString(7, usernameLength);
                string message = buffer.ReadString(7 + usernameLength, messageLength);

                panelGameplay.AddMessageToChatDisplay(username, message);

                buffer.Consume(7 + usernameLength + messageLength);
                break;
            default:
                print("unknown packet identifier...");
                buffer.Clear();
                break;
        }
    }
    public async void SendPacketToServer(Buffer packet)
    {
        if (!socket.Connected)
            return;
        await socket.GetStream().WriteAsync(packet.bytes, 0, packet.bytes.Length);
    }

    public void SendPlayPacket(int x, int y)
    {
        Buffer packet = PacketBuilder.Play(x, y);
        SendPacketToServer(packet);
    }

    public void SendChatPacket(string msg)
    {
        Buffer packet = PacketBuilder.Chat(msg);
        SendPacketToServer(packet);
    }

    public void SendRematchPacket()
    {
        Buffer packet = PacketBuilder.Rematch();
        SendPacketToServer(packet);
    }
}
