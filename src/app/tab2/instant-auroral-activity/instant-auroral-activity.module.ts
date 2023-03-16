import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InstantAuroralActivityComponent } from './instant-auroral-activity.component';
import { TranslateModule } from '@ngx-translate/core';
import { IonicModule } from '@ionic/angular';
import { AceToEarthPipe } from './ace-to-earth.pipe';

@NgModule({
  declarations: [InstantAuroralActivityComponent, AceToEarthPipe],
  exports: [InstantAuroralActivityComponent],
  imports: [CommonModule, TranslateModule, IonicModule],
})
export class InstantAuroralActivityModule {}
