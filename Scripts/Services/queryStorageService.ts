﻿import Q = require('q')
import fServ = require('./fileService')
import repo = require('./typedRepository')
import d = require('../dictionary')

export interface QuerySettings {
    BaseDirectory: string;
}

export interface SavedQuery {
    Id: string;
    Name: string;
    Query: string;
    Settings: QuerySettings;
}

export class QueryStorageService {

    public static QueryExtension = 'jsoql';

    constructor(private fileService: fServ.FileService,
        private querySettingsRepo : repo.TypedRepository<d.Dictionary<QuerySettings>>) {
    }

    GetAll(): Q.Promise<SavedQuery[]> {
        var querySettings = this.querySettingsRepo.Get() || {};
        var loadFiles = this.fileService.GetAll().map(entry =>
            this.fileService.Load(entry.Id)
                .fail(() => {
                    console.log('Failed to load file, it will be ignored:  ' + entry.Id);
                    return null;
                })
                .then(data => {
                    return {
                        Id: entry.Id,
                        Name: entry.Name,
                        Query: data,
                        Settings: querySettings[entry.Id]
                    };
                })
            );

        return Q.all(loadFiles)
            .then(loaded => loaded.filter(file => !!file));
    }

    Save(query: SavedQuery): Q.Promise<SavedQuery> {
        return this.fileService.Save(query.Query, { StorageId: query.Id, Extensions: [QueryStorageService.QueryExtension] })
            .then(saved => {
                var allSettings = this.querySettingsRepo.Get() || {};
                allSettings[saved.Id] = query.Settings;
                this.querySettingsRepo.Put(allSettings);

                return {
                    Id: saved.Id,
                    Name: saved.Name,
                    Query: query.Query,
                    Settings: query.Settings
                };
            });
    }

}