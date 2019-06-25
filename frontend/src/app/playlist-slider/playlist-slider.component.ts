import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { NguCarouselConfig } from '@ngu/carousel';
import { BeatSaberPlaylist } from '../models/BeatSaberPlaylist';
import { Observable } from 'rxjs';
import { AppSettings } from '../appSettings';
import { BeatSaberSong } from '../models/BeatSaberSong';
import { ConfigService } from '../services/config.service';
import { BeatOnApiService } from '../services/beat-on-api.service';
import { BeatOnConfig } from '../models/BeatOnConfig';
import { AddEditPlaylistDialogComponent } from '../add-edit-playlist-dialog/add-edit-playlist-dialog.component';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { HostMessageService } from '../services/host-message.service';

@Component({
  selector: 'app-playlist-slider',
  templateUrl: './playlist-slider.component.html',
  styleUrls: ['./playlist-slider.component.scss']
})
export class PlaylistSliderComponent implements OnInit {
  @Output() public selectedPlaylist: EventEmitter<BeatSaberPlaylist> = new EventEmitter<BeatSaberPlaylist>();
  private _playlists : BeatSaberPlaylist[] = [];

  @Input() public set playlists(playlists : BeatSaberPlaylist[]) {
    this._playlists = playlists;
    if (this.selected != null && this.selected.PlaylistID != null) {
      if (this._playlists == null) {
        this.selected = null;
        this.selectedPlaylist.emit(null);
      } else {
        var found = null;
        this._playlists.forEach(p => {
          if (p.PlaylistID == this.selected.PlaylistID) {
            found = p;
          }
        });
        this.selected = found;
        this.selectedPlaylist.emit(found);
      }
    }
  }

  public get playlists() {
    return this._playlists
  }
  
   selected : BeatSaberPlaylist;
   constructor(private dialog : MatDialog, private configSvc : ConfigService, private beatOnApi : BeatOnApiService, private msgSvc : HostMessageService) {

   }



  getBackground(item) {
    return 'url('+ AppSettings.API_ENDPOINT +'/host/beatsaber/playlist/cover?playlistid=' + item.PlaylistID + ')';
  }

  onTileClick(item) {
    console.log("playlist selecteD");
    this.selected = item;
    this.selectedPlaylist.emit(item);
  }
  public carouselTile: NguCarouselConfig = {
    grid: { xs:4, sm:4, md: 4, lg: 4, all: 0 },
    slide: 3,
    speed: 250,
    point: {
      visible: false
    },
    load: 2,
    velocity: 0,
    touch: true,
    easing: 'cubic-bezier(0, 0, 0.2, 1)',
    vertical: {
      enabled: true,
      height: 360
    }
  };
 
  ngOnInit() {
     
  }
  clickAddPlaylist() {
    var dialogRef = this.dialog.open(AddEditPlaylistDialogComponent, {
      width: '450px',
      height: '320px',
      disableClose: true,
      data: {playlist: <BeatSaberPlaylist>{}, isNew: true}
    });
    dialogRef.afterClosed().subscribe(res => this.dialogClosed(res));
  }

  clickEditPlaylist(item) {
    var dialogRef = this.dialog.open(AddEditPlaylistDialogComponent, {
      width: '450px',
      height: '320px',
      disableClose: true,
      data: {playlist: item, isNew: false}
    });
    dialogRef.afterClosed().subscribe(res => this.dialogClosed(res));
  }
  dialogClosed(result)
  {
    //if cancelled
    if (result == null)
      return;

    if (result['deletePlaylist'] === true) {
      //delete playlist
      this.msgSvc.sendMessage(JSON.stringify({Type:"DeletePlaylist", PlaylistID: result.playlist.PlaylistID}));
    } else {
      //must be a save
      if (result.isNew) {
        this.configSvc.getConfig().subscribe((cfg) => {
          cfg.Config.Playlists.push(result.playlist);
          this.msgSvc.sendMessage(JSON.stringify({Type: "AddOrUpdatePlaylist", Playlist: result.playlist }));
        })
      } else {
        this.configSvc.getConfig().subscribe((cfg) => {
          var found = null;
          cfg.Config.Playlists.forEach(p=>{
            if (p.PlaylistID == result.playlist.PlaylistID) {
              found = p;
              if (result.playlist.CoverImageBytes && result.playlist.CoverImageBytes > 50) {
                p.CoverImageBytes = result.playlist.CoverImageBytes;
              }
              p.PlaylistName = result.playlist.PlaylistName;
            }
          });
          if (found) {
            this.msgSvc.sendMessage(JSON.stringify({Type: "AddOrUpdatePlaylist", Playlist: found }));
          }
        })
      }
    }
  }
  playlistDrop(item : BeatSaberPlaylist, evt) 
  {
    console.log("got a drop!");
    let oldPlaylist : BeatSaberPlaylist = <BeatSaberPlaylist>evt.previousContainer.data;
    if (oldPlaylist.PlaylistID === item.PlaylistID) {
      console.log("dropped a song on the same playlist it is in, doing nothing");
     // return;
    }
    var oldIndex = oldPlaylist.SongList.findIndex(x=> evt.item.element.nativeElement.attributes["songid"] && x.SongID == evt.item.element.nativeElement.attributes["songid"].value);
    if (oldIndex < 0)
    return;
    let moveSong : BeatSaberSong = oldPlaylist.SongList.splice(oldIndex,1)[0];
    oldPlaylist.SongList = oldPlaylist.SongList.slice();
    if (moveSong != null) {
      this.configSvc.getConfig().subscribe((cfg : BeatOnConfig) => {
        
        cfg.Config.Playlists.forEach((p) => {
            if (p.PlaylistID == item.PlaylistID) {
              p.SongList.push(moveSong);
            } else {

              var oldIdx;
              var ctr = -1;
              p.SongList.forEach((s) =>
              {
                ctr = ctr + 1;
                if (p.PlaylistID == oldPlaylist.PlaylistID) {
                  oldIdx = ctr;
                }
              });
              if (oldIdx > -1) {
                p.SongList.splice(oldIdx, 1);
              } else {
                console.log("Did not find the song in the playlist it was moving from!");
              }
              
          }
        });
        this.msgSvc.sendMessage(JSON.stringify({Type:"MoveSongToPlaylist", SongID: moveSong.SongID, ToPlaylistID: item.PlaylistID}));
      });      
    }
    
   // evt.previousContainer.data[evt.previousIndex] is song
   // item.playlistid is playlistid
  }
 
}


