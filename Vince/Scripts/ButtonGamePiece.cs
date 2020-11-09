using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;
using UnityEngine.Audio;

public struct GridPOS
{
    public int X;
    public int Y;
    public GridPOS(int X, int Y)
    {
        this.X = X;
        this.Y = Y;
    }

    public override string ToString()
    {
        return $"Grid Position: ({X}, {Y})";
    }
}
public class ButtonGamePiece : MonoBehaviour
{
    public GridPOS pos;
    public Sprite spriteEmpty;
    public Sprite spriteRed;
    public Sprite spriteBlue;
    public AudioClip clip;

    private AudioSource audioSource;
    private Button bttn;

    public void Init(GridPOS pos, UnityAction callback)
    {
        this.pos = pos;
        bttn = GetComponent<Button>();

        //bttn.onClick.AddListener(new UnityEngine.Events.UnityAction(ButtonClicked));
        //bttn.onClick.AddListener(() => ButtonClicked());
        bttn.onClick.AddListener(callback);
        audioSource = GetComponent<AudioSource>();
        audioSource.clip = clip;

    }
    public void ButtonClicked()
    {
        print("Ooh that tickles...");
    }

    public void SetOwner(byte b)
    {
        if (b == 0)
        {
            bttn.image.sprite = spriteEmpty;
            audioSource.Play();
        }
        if (b == 1)
        {
            bttn.image.sprite = spriteRed;
            audioSource.Play();
        }
        if (b == 2)
        {
            bttn.image.sprite = spriteBlue;
            audioSource.Play();
        }
    }
}
